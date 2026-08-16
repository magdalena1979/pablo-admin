insert into public.livestock_decisions(id,farm_id,campaign_id,source_cycle_id,herd_name,decision_date,heads,current_weight_kg,current_price_ars_kg,sale_cost_percent,freight_ars_head,notes,created_by)
select v.id,v.farm_id,v.campaign_id,v.cycle_id,v.herd,v.day,v.heads,v.weight,v.price,3,v.freight,v.notes,p.id from(values
('ed100000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000001'::uuid,'30000000-0000-4000-8000-000000000001'::uuid,'aa100000-0000-4000-8000-000000000001'::uuid,'Terneros destete cabeza', '2026-08-16'::date,86,182::numeric,6900::numeric,28500::numeric,'Evaluar recría con campo natural mejorado y maíz propio'),
('ed400000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000004','aa400000-0000-4000-8000-000000000001','Terneros Angus destete','2026-08-16',61,176,7100,31000,'Campo con servicio veterinario: escenario para conversar con el cliente')
)v(id,farm_id,campaign_id,cycle_id,herd,day,heads,weight,price,freight,notes)cross join lateral(select id from public.profiles where role='super_admin'and active order by created_at limit 1)p on conflict(id)do update set current_weight_kg=excluded.current_weight_kg,current_price_ars_kg=excluded.current_price_ars_kg;
insert into public.livestock_decision_options(id,decision_id,destination,days_to_sale,target_weight_kg,future_price_ars_kg,mortality_percent,feed_cost_ars_head,pasture_cost_ars_head,health_cost_ars_head,other_cost_ars_head,capital_rate_monthly_percent,required_hectares)values
('ee100000-0000-4000-8000-000000000001','ed100000-0000-4000-8000-000000000001','vender',0,182,6900,0,0,0,0,0,0,0),
('ee100000-0000-4000-8000-000000000002','ed100000-0000-4000-8000-000000000001','recriar',180,305,6100,1.2,158000,94000,18000,22000,2.2,205),
('ee100000-0000-4000-8000-000000000003','ed100000-0000-4000-8000-000000000001','terminar',300,435,5550,2,395000,132000,28000,41000,2.2,238),
('ee400000-0000-4000-8000-000000000001','ed400000-0000-4000-8000-000000000004','vender',0,176,7100,0,0,0,0,0,0,0),
('ee400000-0000-4000-8000-000000000002','ed400000-0000-4000-8000-000000000004','recriar',190,300,6250,1.5,176000,106000,19000,25000,2.2,168),
('ee400000-0000-4000-8000-000000000003','ed400000-0000-4000-8000-000000000004','terminar',310,430,5650,2.2,438000,145000,30000,48000,2.2,190)
on conflict(decision_id,destination)do update set future_price_ars_kg=excluded.future_price_ars_kg,feed_cost_ars_head=excluded.feed_cost_ars_head,pasture_cost_ars_head=excluded.pasture_cost_ars_head,capital_rate_monthly_percent=excluded.capital_rate_monthly_percent;
