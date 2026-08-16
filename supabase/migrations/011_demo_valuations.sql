insert into public.exchange_rates(id,rate_date,ars_per_usd,source_note,created_by)
select 'd1000000-0000-4000-8000-000000000001', '2026-08-15', 1385, 'Tipo de cambio manual de referencia para gestión', p.id from public.profiles p where p.role='super_admin' and p.active order by p.created_at limit 1
on conflict(rate_date) do update set ars_per_usd=excluded.ars_per_usd,source_note=excluded.source_note;
insert into public.category_valuations(id,farm_id,campaign_id,category_id,valuation_date,price_per_kg_ars,created_by)
select gen_random_uuid(),f.id,c.id,lc.id,'2026-08-15',case lc.name when 'Vaca' then 2850 when 'Vaquillona' then 3200 when 'Ternero' then 4100 when 'Ternera' then 3950 when 'Novillo' then 3600 when 'Novillito' then 3750 when 'Toro' then 2450 else 3000 end,p.id
from public.farms f join public.campaigns c on c.farm_id=f.id and c.active cross join public.livestock_categories lc cross join lateral(select id from public.profiles where role='super_admin' and active order by created_at limit 1)p
on conflict(farm_id,campaign_id,category_id,valuation_date) do update set price_per_kg_ars=excluded.price_per_kg_ars;
