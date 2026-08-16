alter table public.field_operations drop constraint if exists field_operations_check;

insert into public.field_operations(id,farm_id,campaign_id,activity,operation_date,name,operation_type,lot_id,herd_id,worked_hectares,contractor,status,notes,created_by)
select v.id,v.farm_id,v.campaign_id,v.activity::public.production_activity,v.operation_date,v.name,v.operation_type,v.lot_id,v.herd_id,v.hectares,v.contractor,v.status::public.operation_status,v.notes,p.id from(values
('e1000000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000001'::uuid,'30000000-0000-4000-8000-000000000001'::uuid,'ganaderia','2026-08-04'::date,'Plan sanitario pre-servicio','Vacunación',null::uuid,'50000000-0000-4000-8000-000000000001'::uuid,null::numeric,null,'realizada','Vacunación reproductiva del rodeo general'),
('e1000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','agricultura','2026-07-12','Siembra de maíz para silo','Siembra','40000000-0000-4000-8000-000000000004',null,305,'Servicios Rurales Gómez','realizada','Maíz destinado a reserva ganadera'),
('e2000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','ganaderia','2026-07-28','Pesaje de recría','Pesaje','40000000-0000-4000-8000-000000000006','50000000-0000-4000-8000-000000000003',null,'Servicios Rurales Gómez','realizada','Control de ganancia diaria'),
('e3000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003','agricultura','2026-08-02','Implantación de maíz','Siembra','40000000-0000-4000-8000-000000000013',null,390,'Servicios Rurales Gómez','en_curso','Semilla y fertilización de base'),
('e3000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003','ganaderia','2026-08-10','Tratamiento sanitario de novillos','Tratamiento','40000000-0000-4000-8000-000000000011','50000000-0000-4000-8000-000000000006',null,null,'realizada','Tratamiento de queratoconjuntivitis'),
('e4000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000004','ganaderia','2026-08-06','Reparación de manga','Mantenimiento','40000000-0000-4000-8000-000000000016',null,null,'Servicios Rurales Gómez','realizada','Cambio de tablas y bulones')
)v(id,farm_id,campaign_id,activity,operation_date,name,operation_type,lot_id,herd_id,hectares,contractor,status,notes) cross join lateral(select id from public.profiles where role='super_admin' and active order by created_at limit 1)p on conflict(id)do update set status=excluded.status,notes=excluded.notes;

insert into public.expense_allocations(expense_id,operation_id,activity,lot_id,herd_id,percentage,allocated_amount,created_by)
select x.expense_id,x.operation_id,x.activity::public.production_activity,o.lot_id,o.herd_id,x.percentage,round(e.amount*x.percentage/100,2),e.created_by
from(values
('b1000000-0000-4000-8000-000000000001'::uuid,'e1000000-0000-4000-8000-000000000001'::uuid,'ganaderia',100::numeric),
('b2000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001','ganaderia',100),
('b3000000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000001','agricultura',100),
('b3000000-0000-4000-8000-000000000002','e3000000-0000-4000-8000-000000000001','agricultura',70),
('b4000000-0000-4000-8000-000000000001','e4000000-0000-4000-8000-000000000001','ganaderia',100)
)x(expense_id,operation_id,activity,percentage) join public.expenses e on e.id=x.expense_id join public.field_operations o on o.id=x.operation_id
on conflict do nothing;
insert into public.expense_allocations(expense_id,operation_id,activity,percentage,allocated_amount,created_by)
select e.id,null,'general',30,round(e.amount*.30,2),e.created_by from public.expenses e where e.id='b3000000-0000-4000-8000-000000000002' on conflict do nothing;
