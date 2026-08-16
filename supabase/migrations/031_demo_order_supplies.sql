insert into public.work_order_inputs(id,work_order_id,item_id,dose_per_hectare,required_quantity,reserved_quantity,unit_value_ars,created_by)
select 'db100000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000001','da300000-0000-4000-8000-000000000003',150,58500,46000,1130,p.id
from public.profiles p where p.role='super_admin' and p.active order by p.created_at limit 1
on conflict(work_order_id,item_id)do update set dose_per_hectare=excluded.dose_per_hectare,required_quantity=excluded.required_quantity,reserved_quantity=excluded.reserved_quantity,unit_value_ars=excluded.unit_value_ars;

insert into public.inventory_movements(id,item_id,movement_date,movement_type,quantity,concept,reference,work_order_id,created_by)
select 'dd300000-0000-4000-8000-000000000001','da300000-0000-4000-8000-000000000003','2026-08-16','reserva',46000,'Reserva de urea para implantación de maíz','OT Implantación de maíz','e3000000-0000-4000-8000-000000000001',p.id
from public.profiles p where p.role='super_admin' and p.active order by p.created_at limit 1
on conflict(id)do nothing;

insert into public.purchase_requests(id,farm_id,work_order_id,item_id,requested_on,needed_by,item_name,quantity,unit,estimated_unit_price_ars,suggested_supplier,status,created_by)
select 'dc300000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','e3000000-0000-4000-8000-000000000001','da300000-0000-4000-8000-000000000003','2026-08-16','2026-08-22','Urea granulada',12500,'kg',1130,'Agroinsumos del Centro','pendiente',p.id
from public.profiles p where p.role='super_admin' and p.active order by p.created_at limit 1
on conflict(id)do update set quantity=excluded.quantity,needed_by=excluded.needed_by,estimated_unit_price_ars=excluded.estimated_unit_price_ars;
