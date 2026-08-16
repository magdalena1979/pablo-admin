insert into public.suppliers(id,name,tax_id,category,phone,email) values
 ('a1000000-0000-4000-8000-000000000001','Veterinaria El Rodeo','30-00000101-1','Veterinaria','2281-555101','ventas@elrodeo.demo'),
 ('a1000000-0000-4000-8000-000000000002','Agroinsumos del Centro','30-00000102-8','Insumos agrícolas','2284-555202','cuentas@agrocentro.demo'),
 ('a1000000-0000-4000-8000-000000000003','Servicios Rurales Gómez','20-00000103-4','Contratista rural','2494-555303','gomez@servicios.demo'),
 ('a1000000-0000-4000-8000-000000000004','Combustibles Azul S.A.','30-00000104-5','Combustible','2281-555404','administracion@combustiblesazul.demo')
on conflict(id) do update set name=excluded.name,category=excluded.category;

insert into public.expenses(id,farm_id,lot_id,supplier_id,expense_date,category,concept,currency,amount,source,status,receipt_number,notes,created_by,reviewed_by,reviewed_at)
select v.id,v.farm_id,v.lot_id,v.supplier_id,v.expense_date,v.category,v.concept,v.currency::public.money_currency,v.amount,v.source::public.expense_source,v.status::public.expense_status,v.receipt_number,v.notes,p.id,case when v.status='aprobado' then p.id end,case when v.status='aprobado' then v.expense_date::timestamptz+interval '1 day' end
from(values
 ('b1000000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000001'::uuid,'40000000-0000-4000-8000-000000000001'::uuid,'a1000000-0000-4000-8000-000000000001'::uuid,'2026-08-04'::date,'Sanidad','Vacunas reproductivas','ARS',486000::numeric,'administracion','aprobado','FC A 0003-1842','Plan pre-servicio'),
 ('b1000000-0000-4000-8000-000000000002'::uuid,'20000000-0000-4000-8000-000000000001'::uuid,null::uuid,'a1000000-0000-4000-8000-000000000004'::uuid,'2026-08-11'::date,'Combustible','Gasoil para recorridas','ARS',238400::numeric,'caja_chica','pendiente','TK 08412','Carga informada por encargado'),
 ('b2000000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000002'::uuid,'40000000-0000-4000-8000-000000000006'::uuid,'a1000000-0000-4000-8000-000000000003'::uuid,'2026-07-28'::date,'Contratistas','Trabajo de manga y pesaje','ARS',315000::numeric,'administracion','aprobado','FC C 0001-0914','Jornada completa'),
 ('b2000000-0000-4000-8000-000000000002'::uuid,'20000000-0000-4000-8000-000000000002'::uuid,null::uuid,'a1000000-0000-4000-8000-000000000001'::uuid,'2026-08-13'::date,'Sanidad','Antiparasitarios recría','USD',420::numeric,'administracion','pendiente','FC A 0003-1901','Cotización expresada en dólares'),
 ('b3000000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000003'::uuid,'40000000-0000-4000-8000-000000000013'::uuid,'a1000000-0000-4000-8000-000000000002'::uuid,'2026-08-02'::date,'Agricultura','Semilla de maíz','USD',12850::numeric,'administracion','aprobado','FC A 0008-7721','Campaña gruesa'),
 ('b3000000-0000-4000-8000-000000000002'::uuid,'20000000-0000-4000-8000-000000000003'::uuid,null::uuid,'a1000000-0000-4000-8000-000000000004'::uuid,'2026-08-12'::date,'Combustible','Gasoil maquinaria','ARS',692000::numeric,'administracion','pendiente','FC B 0012-5510','Pendiente validar litros'),
 ('b4000000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000004'::uuid,'40000000-0000-4000-8000-000000000016'::uuid,'a1000000-0000-4000-8000-000000000003'::uuid,'2026-08-06'::date,'Mantenimiento','Reparación de manga','ARS',185000::numeric,'caja_chica','aprobado','RC 0048','Cambio de tablas y bulones'),
 ('b4000000-0000-4000-8000-000000000002'::uuid,'20000000-0000-4000-8000-000000000004'::uuid,null::uuid,'a1000000-0000-4000-8000-000000000001'::uuid,'2026-08-14'::date,'Sanidad','Vacunas clostridiales','ARS',267500::numeric,'administracion','pendiente','FC A 0003-1918','Primera y segunda dosis')
)v(id,farm_id,lot_id,supplier_id,expense_date,category,concept,currency,amount,source,status,receipt_number,notes)
cross join lateral(select id from public.profiles where role='super_admin' and active order by created_at limit 1)p
on conflict(id) do update set amount=excluded.amount,status=excluded.status,notes=excluded.notes;
