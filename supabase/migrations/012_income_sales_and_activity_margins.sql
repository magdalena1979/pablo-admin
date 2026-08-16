create type public.production_activity as enum ('ganaderia','agricultura','general');
create type public.sale_status as enum ('pendiente','parcial','cobrado','anulado');

alter table public.expenses add column campaign_id uuid references public.campaigns(id) on delete set null;
alter table public.expenses add column activity public.production_activity not null default 'general';
update public.expenses set activity=case when category in ('Sanidad','Veterinaria','Hacienda') then 'ganaderia'::public.production_activity when category in ('Agricultura','Semillas','Fertilizantes','Agroquímicos') then 'agricultura'::public.production_activity else 'general'::public.production_activity end;
update public.expenses e set campaign_id=(select c.id from public.campaigns c where c.farm_id=e.farm_id and e.expense_date between c.starts_on and c.ends_on order by c.starts_on desc limit 1) where campaign_id is null;
create index expenses_campaign_activity_idx on public.expenses(campaign_id,activity);

create table public.income_sales (
 id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id) on delete cascade,
 campaign_id uuid not null references public.campaigns(id) on delete cascade, lot_id uuid references public.lots(id) on delete set null,
 sale_date date not null, activity public.production_activity not null, product text not null, buyer text not null,
 quantity numeric(16,2) not null check(quantity>0), unit text not null check(unit in ('kg','tn','cabezas','servicio')),
 unit_price numeric(16,2) not null check(unit_price>0), currency public.money_currency not null default 'ARS',
 exchange_rate numeric(14,4) not null default 1 check(exchange_rate>0), commission_amount numeric(16,2) not null default 0,
 freight_amount numeric(16,2) not null default 0, other_deductions numeric(16,2) not null default 0,
 gross_amount numeric(18,2) generated always as (quantity*unit_price) stored,
 net_amount numeric(18,2) generated always as (quantity*unit_price-commission_amount-freight_amount-other_deductions) stored,
 status public.sale_status not null default 'pendiente', collected_amount numeric(18,2) not null default 0 check(collected_amount>=0),
 document_number text, notes text, created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(commission_amount+freight_amount+other_deductions<=quantity*unit_price), check(collected_amount<=quantity*unit_price)
);
create index income_sales_farm_date_idx on public.income_sales(farm_id,sale_date desc);
create index income_sales_campaign_activity_idx on public.income_sales(campaign_id,activity);
alter table public.income_sales enable row level security;
create policy income_sales_read on public.income_sales for select to authenticated using(public.can_access_farm(farm_id));
create policy income_sales_manage on public.income_sales for all to authenticated using(public.can_manage_farm(farm_id)) with check(public.can_manage_farm(farm_id));

create view public.farm_activity_margins with(security_invoker=true) as
with dimensions as (
 select c.id campaign_id,c.farm_id,f.name farm_name,c.name campaign_name,a.activity
 from public.campaigns c join public.farms f on f.id=c.farm_id cross join (values ('ganaderia'::public.production_activity),('agricultura'::public.production_activity),('general'::public.production_activity)) a(activity)
), income as (
 select campaign_id,activity,sum(net_amount*case when currency='USD' then exchange_rate else 1 end) income_ars,
 sum(collected_amount*case when currency='USD' then exchange_rate else 1 end) collected_ars
 from public.income_sales where status<>'anulado' group by campaign_id,activity
), costs as (
 select campaign_id,activity,sum(amount*case when currency='USD' then coalesce((select er.ars_per_usd from public.exchange_rates er where er.rate_date<=e.expense_date order by er.rate_date desc limit 1),1) else 1 end) costs_ars
 from public.expenses e where status<>'anulado' and campaign_id is not null group by campaign_id,activity
)
select d.campaign_id,d.farm_id,d.farm_name,d.campaign_name,d.activity,coalesce(i.income_ars,0)::numeric(18,2) income_ars,
 coalesce(i.collected_ars,0)::numeric(18,2) collected_ars,coalesce(c.costs_ars,0)::numeric(18,2) costs_ars,
 (coalesce(i.income_ars,0)-coalesce(c.costs_ars,0))::numeric(18,2) margin_ars
from dimensions d left join income i on i.campaign_id=d.campaign_id and i.activity=d.activity left join costs c on c.campaign_id=d.campaign_id and c.activity=d.activity;
grant select on public.farm_activity_margins to authenticated;

