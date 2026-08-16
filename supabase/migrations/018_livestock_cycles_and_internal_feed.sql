create type public.livestock_cycle_stage as enum ('cria','recria','terminacion','ciclo_completo');
create type public.livestock_cycle_status as enum ('planificado','activo','cerrado');
create table public.livestock_cycles(
 id uuid primary key default gen_random_uuid(),farm_id uuid not null references public.farms(id) on delete cascade,campaign_id uuid not null references public.campaigns(id) on delete cascade,
 herd_id uuid not null references public.herds(id) on delete restrict,lot_id uuid references public.lots(id) on delete set null,stage public.livestock_cycle_stage not null,
 starts_on date not null,ends_on date,assigned_hectares numeric(12,2) not null check(assigned_hectares>0),opening_heads integer not null default 0 check(opening_heads>=0),
 opening_weight_kg numeric(16,2) not null default 0 check(opening_weight_kg>=0),opening_price_ars_kg numeric(14,2) not null default 0 check(opening_price_ars_kg>=0),
 purchased_heads integer not null default 0 check(purchased_heads>=0),purchased_weight_kg numeric(16,2) not null default 0 check(purchased_weight_kg>=0),purchase_cost_ars numeric(18,2) not null default 0 check(purchase_cost_ars>=0),
 sold_heads integer not null default 0 check(sold_heads>=0),sold_weight_kg numeric(16,2) not null default 0 check(sold_weight_kg>=0),
 transfers_in_weight_kg numeric(16,2) not null default 0,transfers_out_weight_kg numeric(16,2) not null default 0,deaths_heads integer not null default 0 check(deaths_heads>=0),
 closing_heads integer not null default 0 check(closing_heads>=0),closing_weight_kg numeric(16,2) not null default 0 check(closing_weight_kg>=0),closing_price_ars_kg numeric(14,2) not null default 0 check(closing_price_ars_kg>=0),
 target_adg_kg numeric(8,3) not null default .600 check(target_adg_kg>=0),target_kg_ha numeric(10,2) not null default 90 check(target_kg_ha>=0),status public.livestock_cycle_status not null default 'activo',notes text,
 created_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(campaign_id,herd_id)
);
alter table public.income_sales add column herd_id uuid references public.herds(id) on delete set null;
create table public.feed_transfers(
 id uuid primary key default gen_random_uuid(),agricultural_cycle_id uuid not null references public.agricultural_cycles(id) on delete restrict,
 livestock_cycle_id uuid not null references public.livestock_cycles(id) on delete cascade,transfer_date date not null,tons numeric(14,3) not null check(tons>0),
 price_ars_ton numeric(16,2) not null check(price_ars_ton>=0),notes text,created_by uuid not null references public.profiles(id),created_at timestamptz not null default now()
);
alter table public.livestock_cycles enable row level security;alter table public.feed_transfers enable row level security;
create policy livestock_cycles_read on public.livestock_cycles for select to authenticated using(public.can_access_farm(farm_id));
create policy livestock_cycles_manage on public.livestock_cycles for all to authenticated using(public.can_manage_farm(farm_id))with check(public.can_manage_farm(farm_id));
create policy feed_transfers_read on public.feed_transfers for select to authenticated using(exists(select 1 from public.livestock_cycles c where c.id=livestock_cycle_id and public.can_access_farm(c.farm_id)));
create policy feed_transfers_manage on public.feed_transfers for all to authenticated using(exists(select 1 from public.livestock_cycles c where c.id=livestock_cycle_id and public.can_manage_farm(c.farm_id)))with check(exists(select 1 from public.livestock_cycles c where c.id=livestock_cycle_id and public.can_manage_farm(c.farm_id)));
create index livestock_cycles_farm_idx on public.livestock_cycles(farm_id,campaign_id);create index feed_transfers_livestock_idx on public.feed_transfers(livestock_cycle_id);

create or replace function public.record_feed_transfer(p_agricultural_cycle_id uuid,p_livestock_cycle_id uuid,p_transfer_date date,p_tons numeric,p_price_ars_ton numeric,p_notes text default null)
returns void language plpgsql security definer set search_path='' as $$
declare v_crop public.agricultural_cycles;v_cycle public.livestock_cycles;
begin
 select * into v_crop from public.agricultural_cycles where id=p_agricultural_cycle_id for update;
 select * into v_cycle from public.livestock_cycles where id=p_livestock_cycle_id for update;
 if v_crop.id is null or v_cycle.id is null or v_crop.farm_id<>v_cycle.farm_id or not public.can_manage_farm(v_cycle.farm_id)then raise exception 'Transferencia inválida o sin permiso' using errcode='42501';end if;
 if p_tons<=0 or p_tons>v_crop.stock_tons then raise exception 'Toneladas superiores al stock disponible';end if;
 insert into public.feed_transfers(agricultural_cycle_id,livestock_cycle_id,transfer_date,tons,price_ars_ton,notes,created_by)values(p_agricultural_cycle_id,p_livestock_cycle_id,p_transfer_date,p_tons,p_price_ars_ton,nullif(trim(p_notes),''),auth.uid());
 update public.agricultural_cycles set livestock_feed_tons=livestock_feed_tons+p_tons,updated_at=now()where id=p_agricultural_cycle_id;
end;$$;
revoke all on function public.record_feed_transfer(uuid,uuid,date,numeric,numeric,text)from public;
grant execute on function public.record_feed_transfer(uuid,uuid,date,numeric,numeric,text)to authenticated;

create view public.livestock_cycle_performance with(security_invoker=true)as
with costs as(select c.id cycle_id,sum(a.allocated_amount*case when e.currency='USD' then coalesce((select er.ars_per_usd from public.exchange_rates er where er.rate_date<=e.expense_date order by er.rate_date desc limit 1),1)else 1 end)direct_cost from public.livestock_cycles c left join public.expense_allocations a on a.herd_id=c.herd_id left join public.expenses e on e.id=a.expense_id and e.status<>'anulado' group by c.id),
sales as(select c.id cycle_id,coalesce(sum(s.net_amount*case when s.currency='USD'then s.exchange_rate else 1 end),0)sales_revenue from public.livestock_cycles c left join public.income_sales s on s.campaign_id=c.campaign_id and s.herd_id=c.herd_id and s.status<>'anulado' group by c.id),
feed as(select livestock_cycle_id,sum(tons)feed_tons,sum(tons*price_ars_ton)feed_cost from public.feed_transfers group by livestock_cycle_id)
select c.id,c.farm_id,c.campaign_id,c.herd_id,c.lot_id,f.name farm_name,h.name herd_name,l.name lot_name,c.stage,c.starts_on,c.ends_on,c.assigned_hectares,c.opening_heads,c.opening_weight_kg,c.purchased_heads,c.purchased_weight_kg,c.sold_heads,c.sold_weight_kg,c.deaths_heads,c.closing_heads,c.closing_weight_kg,c.target_adg_kg,c.target_kg_ha,c.status,
(c.closing_weight_kg+c.sold_weight_kg+c.transfers_out_weight_kg-c.opening_weight_kg-c.purchased_weight_kg-c.transfers_in_weight_kg)::numeric(16,2)produced_kg,
case when c.assigned_hectares>0 then round((c.closing_weight_kg+c.sold_weight_kg+c.transfers_out_weight_kg-c.opening_weight_kg-c.purchased_weight_kg-c.transfers_in_weight_kg)/c.assigned_hectares,2)else 0 end kg_ha,
case when greatest(c.opening_heads+c.purchased_heads,c.closing_heads+c.sold_heads)>0 and greatest(1,coalesce(c.ends_on,current_date)-c.starts_on)>0 then round((c.closing_weight_kg+c.sold_weight_kg+c.transfers_out_weight_kg-c.opening_weight_kg-c.purchased_weight_kg-c.transfers_in_weight_kg)/greatest(c.opening_heads+c.purchased_heads,c.closing_heads+c.sold_heads)/greatest(1,coalesce(c.ends_on,current_date)-c.starts_on),3)else 0 end adg_kg,
coalesce(s.sales_revenue,0)::numeric(18,2)sales_revenue_ars,(c.closing_weight_kg*c.closing_price_ars_kg)::numeric(18,2)closing_stock_ars,
(c.opening_weight_kg*c.opening_price_ars_kg)::numeric(18,2)opening_stock_ars,c.purchase_cost_ars,coalesce(k.direct_cost,0)::numeric(18,2)direct_cost_ars,coalesce(fd.feed_tons,0)::numeric(14,3)feed_tons,coalesce(fd.feed_cost,0)::numeric(18,2)feed_cost_ars,
(coalesce(s.sales_revenue,0)+c.closing_weight_kg*c.closing_price_ars_kg-c.opening_weight_kg*c.opening_price_ars_kg-c.purchase_cost_ars-coalesce(k.direct_cost,0)-coalesce(fd.feed_cost,0))::numeric(18,2)margin_ars,
case when c.assigned_hectares>0 then round((coalesce(s.sales_revenue,0)+c.closing_weight_kg*c.closing_price_ars_kg-c.opening_weight_kg*c.opening_price_ars_kg-c.purchase_cost_ars-coalesce(k.direct_cost,0)-coalesce(fd.feed_cost,0))/c.assigned_hectares,2)else 0 end margin_ha_ars
from public.livestock_cycles c join public.farms f on f.id=c.farm_id join public.herds h on h.id=c.herd_id left join public.lots l on l.id=c.lot_id left join costs k on k.cycle_id=c.id left join sales s on s.cycle_id=c.id left join feed fd on fd.livestock_cycle_id=c.id;
grant select on public.livestock_cycle_performance to authenticated;
