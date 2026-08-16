create table public.campaign_performance (
 id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id) on delete cascade,
 campaign_id uuid not null references public.campaigns(id) on delete cascade, productive_hectares numeric(12,2) not null check(productive_hectares>0),
 opening_weight_kg numeric(16,2) not null default 0, closing_weight_kg numeric(16,2) not null default 0,
 purchases_weight_kg numeric(16,2) not null default 0, sales_weight_kg numeric(16,2) not null default 0,
 transfers_in_kg numeric(16,2) not null default 0, transfers_out_kg numeric(16,2) not null default 0,
 livestock_revenue_ars numeric(18,2) not null default 0, stock_variation_ars numeric(18,2) not null default 0,
 livestock_direct_cost_ars numeric(18,2) not null default 0, agriculture_revenue_ars numeric(18,2) not null default 0,
 agriculture_direct_cost_ars numeric(18,2) not null default 0, cash_balance_ars numeric(18,2) not null default 0,
 target_kg_ha numeric(10,2) not null default 90, target_margin_ha_ars numeric(18,2) not null default 250000,
 updated_by uuid not null references public.profiles(id), updated_at timestamptz not null default now(), unique(farm_id,campaign_id)
);
create table public.category_valuations(id uuid primary key default gen_random_uuid(),farm_id uuid not null references public.farms(id) on delete cascade,campaign_id uuid not null references public.campaigns(id) on delete cascade,category_id uuid not null references public.livestock_categories(id),valuation_date date not null,price_per_kg_ars numeric(14,2) not null check(price_per_kg_ars>0),created_by uuid not null references public.profiles(id),unique(farm_id,campaign_id,category_id,valuation_date));
create table public.exchange_rates(id uuid primary key default gen_random_uuid(),rate_date date not null unique,ars_per_usd numeric(14,4) not null check(ars_per_usd>0),source_note text,created_by uuid not null references public.profiles(id));
alter table public.campaign_performance enable row level security;alter table public.category_valuations enable row level security;alter table public.exchange_rates enable row level security;
create policy performance_read on public.campaign_performance for select to authenticated using(public.can_access_farm(farm_id));
create policy performance_super_manage on public.campaign_performance for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
create policy valuations_read on public.category_valuations for select to authenticated using(public.can_access_farm(farm_id));
create policy valuations_super_manage on public.category_valuations for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
create policy exchange_read on public.exchange_rates for select to authenticated using(true);
create policy exchange_super_manage on public.exchange_rates for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
create view public.farm_campaign_decisions with(security_invoker=true) as select p.id,p.farm_id,p.campaign_id,f.name as farm_name,c.name as campaign_name,p.productive_hectares,(p.closing_weight_kg-p.opening_weight_kg+p.sales_weight_kg+p.transfers_out_kg-p.purchases_weight_kg-p.transfers_in_kg) as produced_kg,round((p.closing_weight_kg-p.opening_weight_kg+p.sales_weight_kg+p.transfers_out_kg-p.purchases_weight_kg-p.transfers_in_kg)/p.productive_hectares,2) as kg_per_ha,(p.livestock_revenue_ars+p.stock_variation_ars-p.livestock_direct_cost_ars) as livestock_margin_ars,(p.agriculture_revenue_ars-p.agriculture_direct_cost_ars) as agriculture_margin_ars,(p.livestock_revenue_ars+p.stock_variation_ars-p.livestock_direct_cost_ars+p.agriculture_revenue_ars-p.agriculture_direct_cost_ars) as total_margin_ars,round((p.livestock_revenue_ars+p.stock_variation_ars-p.livestock_direct_cost_ars+p.agriculture_revenue_ars-p.agriculture_direct_cost_ars)/p.productive_hectares,2) as margin_per_ha_ars,p.cash_balance_ars,p.target_kg_ha,p.target_margin_ha_ars from public.campaign_performance p join public.farms f on f.id=p.farm_id join public.campaigns c on c.id=p.campaign_id;
grant select on public.farm_campaign_decisions to authenticated;
