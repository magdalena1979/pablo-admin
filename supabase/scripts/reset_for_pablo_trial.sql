-- RESET MANUAL PARA PRUEBA DE PABLO
-- Conserva: usuarios, clientes, campos, lotes, categorías, catálogo de labores
-- y el cierre consolidado de la campaña 2025/26.
-- Deja: campaña 2026/27 activa, sin operaciones, con objetivos iniciales editables.
--
-- IMPORTANTE: ejecutar solamente de forma manual y luego de generar un backup.

begin;

do $$
begin
  if not exists(select 1 from public.campaigns where name='2025/26')then
    raise exception 'Cancelado: no existe la campaña histórica 2025/26';
  end if;
  if not exists(select 1 from public.campaigns where name='2026/27')then
    raise exception 'Cancelado: no existe la campaña operativa 2026/27';
  end if;
  if not exists(select 1 from public.profiles where role='super_admin'and active)then
    raise exception 'Cancelado: no existe un super administrador activo';
  end if;
end$$;

-- Dependencias operativas, desde las más específicas hacia las maestras.
delete from public.livestock_decision_options;
delete from public.livestock_decisions;
delete from public.work_order_inputs;
delete from public.purchase_requests;
delete from public.inventory_movements;
delete from public.feed_transfers;
delete from public.expense_allocations;
delete from public.field_operation_lots;
delete from public.field_operations;
delete from public.health_events;
delete from public.reproductive_events;
delete from public.livestock_movements;
delete from public.animals;
delete from public.livestock_cycles;
delete from public.agricultural_cycles;
delete from public.income_sales;
delete from public.expenses;
delete from public.crop_stands;
delete from public.inventory_batches;
delete from public.inventory_items;
delete from public.financial_commitments;
delete from public.monthly_closures;
delete from public.management_budgets;
delete from public.category_valuations;
delete from public.exchange_rates;
delete from public.audit_logs;
delete from public.herds;
delete from public.suppliers;

-- Conserva únicamente el cierre histórico 2025/26.
delete from public.campaign_performance p
using public.campaigns c
where p.campaign_id=c.id and c.name<>'2025/26';

-- Conserva solo el histórico y la campaña disponible para cargar la prueba.
delete from public.campaigns where name not in('2025/26','2026/27');
update public.campaigns set active=(name='2026/27');

-- Crea una base vacía de objetivos para la campaña actual.
insert into public.campaign_performance(
  farm_id,campaign_id,productive_hectares,
  opening_weight_kg,closing_weight_kg,purchases_weight_kg,sales_weight_kg,
  transfers_in_kg,transfers_out_kg,livestock_revenue_ars,stock_variation_ars,
  livestock_direct_cost_ars,agriculture_revenue_ars,agriculture_direct_cost_ars,
  cash_balance_ars,target_kg_ha,target_margin_ha_ars,updated_by
)
select f.id,c.id,greatest(coalesce(sum(l.hectares),0),1),
  0,0,0,0,0,0,0,0,0,0,0,0,
  case when f.service_mode='administracion_integral'then 90 else 85 end,
  250000,p.id
from public.farms f
join public.campaigns c on c.farm_id=f.id and c.name='2026/27'
left join public.lots l on l.farm_id=f.id and l.active
cross join lateral(select id from public.profiles where role='super_admin'and active order by created_at limit 1)p
where f.active
group by f.id,c.id,f.service_mode,p.id
on conflict(farm_id,campaign_id)do nothing;

commit;

-- Control esperado:
select c.name,c.active,count(p.id)as registros_de_resultado
from public.campaigns c
left join public.campaign_performance p on p.campaign_id=c.id
group by c.name,c.active
order by c.name;
