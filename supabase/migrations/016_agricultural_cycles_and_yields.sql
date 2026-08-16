create type public.crop_cycle_status as enum ('planificado','implantado','en_desarrollo','cosecha_parcial','cosechado','cerrado');
create table public.agricultural_cycles(
 id uuid primary key default gen_random_uuid(),farm_id uuid not null references public.farms(id) on delete cascade,
 campaign_id uuid not null references public.campaigns(id) on delete cascade,lot_id uuid not null references public.lots(id) on delete restrict,
 crop text not null,variety text,sown_hectares numeric(12,2) not null check(sown_hectares>0),harvested_hectares numeric(12,2) not null default 0 check(harvested_hectares>=0),
 sowing_date date,harvest_date date,target_yield_kg_ha numeric(12,2) not null check(target_yield_kg_ha>0),
 produced_tons numeric(16,3) not null default 0 check(produced_tons>=0),sold_tons numeric(16,3) not null default 0 check(sold_tons>=0),
 livestock_feed_tons numeric(16,3) not null default 0 check(livestock_feed_tons>=0),other_use_tons numeric(16,3) not null default 0 check(other_use_tons>=0),
 stock_tons numeric(16,3) generated always as (produced_tons-sold_tons-livestock_feed_tons-other_use_tons) stored,
 reference_price_ars_ton numeric(16,2) not null default 0 check(reference_price_ars_ton>=0),status public.crop_cycle_status not null default 'planificado',
 notes text,created_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(campaign_id,lot_id,crop),check(harvested_hectares<=sown_hectares),check(sold_tons+livestock_feed_tons+other_use_tons<=produced_tons)
);
alter table public.field_operations add column agricultural_cycle_id uuid references public.agricultural_cycles(id) on delete set null;
create index agricultural_cycles_farm_campaign_idx on public.agricultural_cycles(farm_id,campaign_id);
create index field_operations_crop_cycle_idx on public.field_operations(agricultural_cycle_id);
alter table public.agricultural_cycles enable row level security;
create policy crop_cycles_read on public.agricultural_cycles for select to authenticated using(public.can_access_farm(farm_id));
create policy crop_cycles_manage on public.agricultural_cycles for all to authenticated using(public.can_manage_farm(farm_id)) with check(public.can_manage_farm(farm_id));

create view public.agricultural_cycle_performance with(security_invoker=true) as
with costs as(
 select o.agricultural_cycle_id,sum(a.allocated_amount*case when e.currency='USD' then coalesce((select er.ars_per_usd from public.exchange_rates er where er.rate_date<=e.expense_date order by er.rate_date desc limit 1),1)else 1 end)cost_ars
 from public.field_operations o join public.expense_allocations a on a.operation_id=o.id join public.expenses e on e.id=a.expense_id
 where o.agricultural_cycle_id is not null and e.status<>'anulado' group by o.agricultural_cycle_id
),revenue as(
 select c.id cycle_id,sum(s.net_amount*case when s.currency='USD' then s.exchange_rate else 1 end)revenue_ars,
 sum(s.quantity)filter(where s.unit='tn')sold_registered_tons
 from public.agricultural_cycles c left join public.income_sales s on s.campaign_id=c.campaign_id and s.lot_id=c.lot_id and s.activity='agricultura' and s.status<>'anulado' group by c.id
)
select c.id,c.farm_id,c.campaign_id,c.lot_id,f.name farm_name,l.name lot_name,c.crop,c.variety,c.sown_hectares,c.harvested_hectares,c.sowing_date,c.harvest_date,c.target_yield_kg_ha,c.produced_tons,
case when c.harvested_hectares>0 then round(c.produced_tons*1000/c.harvested_hectares,2)else 0 end actual_yield_kg_ha,
c.sold_tons,c.livestock_feed_tons,c.other_use_tons,c.stock_tons,c.reference_price_ars_ton,c.status,
coalesce(r.revenue_ars,0)::numeric(18,2) sales_revenue_ars,coalesce(k.cost_ars,0)::numeric(18,2) direct_cost_ars,
(coalesce(r.revenue_ars,0)+(c.livestock_feed_tons+c.stock_tons+c.other_use_tons)*c.reference_price_ars_ton-coalesce(k.cost_ars,0))::numeric(18,2) gross_margin_ars,
case when c.sown_hectares>0 then round((coalesce(r.revenue_ars,0)+(c.livestock_feed_tons+c.stock_tons+c.other_use_tons)*c.reference_price_ars_ton-coalesce(k.cost_ars,0))/c.sown_hectares,2)else 0 end margin_per_ha_ars,
case when c.sown_hectares>0 then round(coalesce(k.cost_ars,0)/c.sown_hectares,2)else 0 end cost_per_ha_ars
from public.agricultural_cycles c join public.farms f on f.id=c.farm_id join public.lots l on l.id=c.lot_id left join costs k on k.agricultural_cycle_id=c.id left join revenue r on r.cycle_id=c.id;
grant select on public.agricultural_cycle_performance to authenticated;

