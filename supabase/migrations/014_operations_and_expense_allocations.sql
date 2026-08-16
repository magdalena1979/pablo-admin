create type public.operation_status as enum ('planificada','en_curso','realizada','cancelada');

create table public.field_operations(
 id uuid primary key default gen_random_uuid(),farm_id uuid not null references public.farms(id) on delete cascade,
 campaign_id uuid not null references public.campaigns(id) on delete cascade,activity public.production_activity not null,
 operation_date date not null,name text not null,operation_type text not null,lot_id uuid references public.lots(id) on delete set null,
 herd_id uuid references public.herds(id) on delete set null,worked_hectares numeric(12,2) check(worked_hectares>0),contractor text,
 status public.operation_status not null default 'planificada',notes text,created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index field_operations_farm_date_idx on public.field_operations(farm_id,operation_date desc);
alter table public.field_operations enable row level security;
create policy operations_read on public.field_operations for select to authenticated using(public.can_access_farm(farm_id));
create policy operations_manage on public.field_operations for all to authenticated using(public.can_manage_farm(farm_id)) with check(public.can_manage_farm(farm_id));

create table public.expense_allocations(
 id uuid primary key default gen_random_uuid(),expense_id uuid not null references public.expenses(id) on delete cascade,
 operation_id uuid references public.field_operations(id) on delete restrict,activity public.production_activity not null,
 lot_id uuid references public.lots(id) on delete set null,herd_id uuid references public.herds(id) on delete set null,
 percentage numeric(7,4) not null check(percentage>0 and percentage<=100),allocated_amount numeric(16,2) not null check(allocated_amount>0),
 created_by uuid not null references public.profiles(id),created_at timestamptz not null default now()
);
create index expense_allocations_expense_idx on public.expense_allocations(expense_id);
alter table public.expense_allocations enable row level security;
create policy allocations_read on public.expense_allocations for select to authenticated using(exists(select 1 from public.expenses e where e.id=expense_id and public.can_access_farm(e.farm_id)));
create policy allocations_manage on public.expense_allocations for all to authenticated using(exists(select 1 from public.expenses e where e.id=expense_id and public.can_manage_farm(e.farm_id))) with check(exists(select 1 from public.expenses e where e.id=expense_id and public.can_manage_farm(e.farm_id)));

create or replace function public.replace_expense_allocations(p_expense_id uuid,p_allocations jsonb)
returns void language plpgsql security definer set search_path=''
as $$
declare v_expense public.expenses;v_total numeric;v_item jsonb;v_operation public.field_operations;v_activity public.production_activity;v_lot uuid;v_herd uuid;
begin
 select * into v_expense from public.expenses where id=p_expense_id for update;
 if not found or not public.can_manage_farm(v_expense.farm_id) then raise exception 'Gasto inexistente o sin permiso' using errcode='42501';end if;
 select coalesce(sum((x->>'percentage')::numeric),0) into v_total from jsonb_array_elements(p_allocations)x;
 if abs(v_total-100)>0.001 then raise exception 'La distribución debe sumar 100%%';end if;
 delete from public.expense_allocations where expense_id=p_expense_id;
 for v_item in select * from jsonb_array_elements(p_allocations) loop
  if nullif(v_item->>'operation_id','') is not null then
   select * into v_operation from public.field_operations where id=(v_item->>'operation_id')::uuid and farm_id=v_expense.farm_id;
   if not found then raise exception 'La labor no pertenece al campo del gasto';end if;
   v_activity:=v_operation.activity;v_lot:=v_operation.lot_id;v_herd:=v_operation.herd_id;
  else v_activity:=coalesce((v_item->>'activity')::public.production_activity,'general');v_lot:=nullif(v_item->>'lot_id','')::uuid;v_herd:=nullif(v_item->>'herd_id','')::uuid;end if;
  insert into public.expense_allocations(expense_id,operation_id,activity,lot_id,herd_id,percentage,allocated_amount,created_by)
  values(p_expense_id,nullif(v_item->>'operation_id','')::uuid,v_activity,v_lot,v_herd,(v_item->>'percentage')::numeric,round(v_expense.amount*(v_item->>'percentage')::numeric/100,2),coalesce(auth.uid(),v_expense.created_by));
 end loop;
 update public.expenses set activity=case when jsonb_array_length(p_allocations)=1 then v_activity else 'general' end,updated_at=now() where id=p_expense_id;
end;$$;
revoke all on function public.replace_expense_allocations(uuid,jsonb) from public;
grant execute on function public.replace_expense_allocations(uuid,jsonb) to authenticated;

drop view public.farm_activity_margins;
create view public.farm_activity_margins with(security_invoker=true) as
with dimensions as(select c.id campaign_id,c.farm_id,f.name farm_name,c.name campaign_name,a.activity from public.campaigns c join public.farms f on f.id=c.farm_id cross join(values('ganaderia'::public.production_activity),('agricultura'::public.production_activity),('general'::public.production_activity))a(activity)),
income as(select campaign_id,activity,sum(net_amount*case when currency='USD' then exchange_rate else 1 end)income_ars,sum(collected_amount*case when currency='USD' then exchange_rate else 1 end)collected_ars from public.income_sales where status<>'anulado' group by campaign_id,activity),
cost_lines as(
 select e.campaign_id,a.activity,a.allocated_amount*case when e.currency='USD' then coalesce((select er.ars_per_usd from public.exchange_rates er where er.rate_date<=e.expense_date order by er.rate_date desc limit 1),1)else 1 end amount_ars from public.expense_allocations a join public.expenses e on e.id=a.expense_id where e.status<>'anulado'
 union all select e.campaign_id,e.activity,e.amount*case when e.currency='USD' then coalesce((select er.ars_per_usd from public.exchange_rates er where er.rate_date<=e.expense_date order by er.rate_date desc limit 1),1)else 1 end from public.expenses e where e.status<>'anulado' and not exists(select 1 from public.expense_allocations a where a.expense_id=e.id)
),costs as(select campaign_id,activity,sum(amount_ars)costs_ars from cost_lines where campaign_id is not null group by campaign_id,activity)
select d.campaign_id,d.farm_id,d.farm_name,d.campaign_name,d.activity,coalesce(i.income_ars,0)::numeric(18,2)income_ars,coalesce(i.collected_ars,0)::numeric(18,2)collected_ars,coalesce(c.costs_ars,0)::numeric(18,2)costs_ars,(coalesce(i.income_ars,0)-coalesce(c.costs_ars,0))::numeric(18,2)margin_ars from dimensions d left join income i on i.campaign_id=d.campaign_id and i.activity=d.activity left join costs c on c.campaign_id=d.campaign_id and c.activity=d.activity;
grant select on public.farm_activity_margins to authenticated;
