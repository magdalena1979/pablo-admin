create table public.field_operation_lots(
 id uuid primary key default gen_random_uuid(),operation_id uuid not null references public.field_operations(id) on delete cascade,
 lot_id uuid not null references public.lots(id) on delete restrict,agricultural_cycle_id uuid references public.agricultural_cycles(id) on delete set null,
 worked_hectares numeric(12,2) not null check(worked_hectares>0),cost_percentage numeric(7,4) not null check(cost_percentage>0 and cost_percentage<=100),
 created_at timestamptz not null default now(),unique(operation_id,lot_id)
);
alter table public.field_operation_lots enable row level security;
create policy operation_lots_read on public.field_operation_lots for select to authenticated using(exists(select 1 from public.field_operations o where o.id=operation_id and public.can_access_farm(o.farm_id)));
create policy operation_lots_manage on public.field_operation_lots for all to authenticated using(exists(select 1 from public.field_operations o where o.id=operation_id and public.can_manage_farm(o.farm_id)))with check(exists(select 1 from public.field_operations o where o.id=operation_id and public.can_manage_farm(o.farm_id)));
create index field_operation_lots_lot_idx on public.field_operation_lots(lot_id);

insert into public.field_operation_lots(operation_id,lot_id,agricultural_cycle_id,worked_hectares,cost_percentage)
select o.id,o.lot_id,o.agricultural_cycle_id,coalesce(o.worked_hectares,l.hectares),100 from public.field_operations o join public.lots l on l.id=o.lot_id where o.lot_id is not null and o.activity='agricultura' on conflict(operation_id,lot_id)do nothing;

create or replace function public.create_multi_lot_work_order(p_farm_id uuid,p_date date,p_activity public.production_activity,p_name text,p_operation_type text,p_contractor text,p_status public.operation_status,p_notes text,p_lots jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_campaign uuid;v_operation uuid;v_item jsonb;v_lot public.lots;v_total numeric;v_hectares numeric;v_cycle uuid;
begin
 if not public.can_manage_farm(p_farm_id)then raise exception 'Sin permiso para administrar el campo' using errcode='42501';end if;
 select id into v_campaign from public.campaigns where farm_id=p_farm_id and p_date between starts_on and ends_on order by starts_on desc limit 1;
 if v_campaign is null then raise exception 'No existe una campaña para la fecha indicada';end if;
 select sum((x->>'hectares')::numeric)into v_total from jsonb_array_elements(p_lots)x;
 if coalesce(v_total,0)<=0 then raise exception 'Debe seleccionar al menos un lote';end if;
 insert into public.field_operations(farm_id,campaign_id,activity,operation_date,name,operation_type,worked_hectares,contractor,status,notes,created_by)
 values(p_farm_id,v_campaign,p_activity,p_date,trim(p_name),trim(p_operation_type),v_total,nullif(trim(p_contractor),''),p_status,nullif(trim(p_notes),''),auth.uid())returning id into v_operation;
 for v_item in select * from jsonb_array_elements(p_lots)loop
  select * into v_lot from public.lots where id=(v_item->>'lot_id')::uuid and farm_id=p_farm_id and active;
  v_hectares:=(v_item->>'hectares')::numeric;
  if v_lot.id is null then raise exception 'Uno de los lotes no pertenece al campo';end if;
  if v_hectares<=0 or v_hectares>v_lot.hectares then raise exception 'La superficie trabajada de % debe estar entre 0 y % ha',v_lot.name,v_lot.hectares;end if;
  select id into v_cycle from public.agricultural_cycles where campaign_id=v_campaign and lot_id=v_lot.id order by created_at desc limit 1;
  insert into public.field_operation_lots(operation_id,lot_id,agricultural_cycle_id,worked_hectares,cost_percentage)values(v_operation,v_lot.id,v_cycle,v_hectares,round(v_hectares/v_total*100,4));
 end loop;
 return v_operation;
end;$$;
revoke all on function public.create_multi_lot_work_order(uuid,date,public.production_activity,text,text,text,public.operation_status,text,jsonb)from public;
grant execute on function public.create_multi_lot_work_order(uuid,date,public.production_activity,text,text,text,public.operation_status,text,jsonb)to authenticated;

create view public.lot_operation_ledger with(security_invoker=true)as
select ol.id,ol.lot_id,l.farm_id,f.name farm_name,l.name lot_name,o.id operation_id,o.operation_date,o.activity,o.name operation_name,o.operation_type,o.contractor,o.status,
ol.worked_hectares,ol.cost_percentage,coalesce(sum(a.allocated_amount*ol.cost_percentage/100*case when e.currency='USD'then coalesce((select er.ars_per_usd from public.exchange_rates er where er.rate_date<=e.expense_date order by er.rate_date desc limit 1),1)else 1 end),0)::numeric(18,2)cost_ars
from public.field_operation_lots ol join public.field_operations o on o.id=ol.operation_id join public.lots l on l.id=ol.lot_id join public.farms f on f.id=l.farm_id left join public.expense_allocations a on a.operation_id=o.id left join public.expenses e on e.id=a.expense_id and e.status<>'anulado'
group by ol.id,ol.lot_id,l.farm_id,f.name,l.name,o.id,o.operation_date,o.activity,o.name,o.operation_type,o.contractor,o.status,ol.worked_hectares,ol.cost_percentage;
grant select on public.lot_operation_ledger to authenticated;

drop view public.agricultural_cycle_performance;
create view public.agricultural_cycle_performance with(security_invoker=true) as
with costs as(select ol.agricultural_cycle_id,sum(a.allocated_amount*ol.cost_percentage/100*case when e.currency='USD'then coalesce((select er.ars_per_usd from public.exchange_rates er where er.rate_date<=e.expense_date order by er.rate_date desc limit 1),1)else 1 end)cost_ars from public.field_operation_lots ol join public.expense_allocations a on a.operation_id=ol.operation_id join public.expenses e on e.id=a.expense_id where ol.agricultural_cycle_id is not null and e.status<>'anulado' group by ol.agricultural_cycle_id),
revenue as(select c.id cycle_id,sum(s.net_amount*case when s.currency='USD'then s.exchange_rate else 1 end)revenue_ars from public.agricultural_cycles c left join public.income_sales s on s.campaign_id=c.campaign_id and s.lot_id=c.lot_id and s.activity='agricultura' and s.status<>'anulado' group by c.id)
select c.id,c.farm_id,c.campaign_id,c.lot_id,f.name farm_name,l.name lot_name,c.crop,c.variety,c.sown_hectares,c.harvested_hectares,c.sowing_date,c.harvest_date,c.target_yield_kg_ha,c.produced_tons,case when c.harvested_hectares>0 then round(c.produced_tons*1000/c.harvested_hectares,2)else 0 end actual_yield_kg_ha,c.sold_tons,c.livestock_feed_tons,c.other_use_tons,c.stock_tons,c.reference_price_ars_ton,c.status,coalesce(r.revenue_ars,0)::numeric(18,2)sales_revenue_ars,coalesce(k.cost_ars,0)::numeric(18,2)direct_cost_ars,(coalesce(r.revenue_ars,0)+(c.livestock_feed_tons+c.stock_tons+c.other_use_tons)*c.reference_price_ars_ton-coalesce(k.cost_ars,0))::numeric(18,2)gross_margin_ars,case when c.sown_hectares>0 then round((coalesce(r.revenue_ars,0)+(c.livestock_feed_tons+c.stock_tons+c.other_use_tons)*c.reference_price_ars_ton-coalesce(k.cost_ars,0))/c.sown_hectares,2)else 0 end margin_per_ha_ars,case when c.sown_hectares>0 then round(coalesce(k.cost_ars,0)/c.sown_hectares,2)else 0 end cost_per_ha_ars from public.agricultural_cycles c join public.farms f on f.id=c.farm_id join public.lots l on l.id=c.lot_id left join costs k on k.agricultural_cycle_id=c.id left join revenue r on r.cycle_id=c.id;
grant select on public.agricultural_cycle_performance to authenticated;

