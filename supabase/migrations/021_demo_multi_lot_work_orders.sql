insert into public.field_operations(id,farm_id,campaign_id,activity,operation_date,name,operation_type,worked_hectares,contractor,status,notes,created_by)
select 'ec300000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003','agricultura','2026-08-14','Pulverización de barbecho','Pulverización',665,'Servicios Rurales Gómez','realizada','Aplicación conjunta en dos cuadros; carga demostrativa multilote',p.id from public.profiles p where p.role='super_admin'and p.active order by p.created_at limit 1 on conflict(id)do nothing;
insert into public.field_operation_lots(operation_id,lot_id,agricultural_cycle_id,worked_hectares,cost_percentage)values
('ec300000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000013','f3000000-0000-4000-8000-000000000002',390,58.6466),
('ec300000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000014','f3000000-0000-4000-8000-000000000003',275,41.3534)
on conflict(operation_id,lot_id)do update set worked_hectares=excluded.worked_hectares,cost_percentage=excluded.cost_percentage;
