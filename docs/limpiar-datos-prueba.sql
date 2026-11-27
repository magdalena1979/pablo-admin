-- Ejecutar en SQL Editor del proyecto de prueba, con la app sin uso.
-- Borra los datos operativos de todos los clientes y establecimientos.
begin;

set local lock_timeout = '5s';

delete from public.professional_invoice_works;
delete from public.professional_work_sessions;
delete from public.professional_invoices;
delete from public.professional_works;

delete from public.ear_tag_session_links;
delete from public.gallagher_csv_confirmations;
delete from public.ear_tags;
delete from public.ear_tag_ranges;
delete from public.ear_tag_receipts;
delete from public.farm_renspas;

-- Quitar dependencias restrictivas antes del borrado por establecimiento.
delete from public.expense_allocations;
delete from public.field_operation_lots;
delete from public.work_order_inputs;
delete from public.feed_transfers;
delete from public.crop_stands;
delete from public.agricultural_cycles;
delete from public.livestock_cycles;
delete from public.livestock_movements;

delete from public.audit_logs
where farm_id is not null or entity_type in ('clients', 'farms', 'farm_renspas', 'ear_tag_receipt', 'professional_work');

-- Las claves foráneas eliminan los datos operativos vinculados, incluidos
-- animales, eventos, sesiones, CSV importados y sus filas.
delete from public.farms;
delete from public.clients;

commit;

select 'clientes' as datos, count(*) as restantes from public.clients
union all select 'establecimientos', count(*) from public.farms
union all select 'renspa', count(*) from public.farm_renspas
union all select 'recepciones', count(*) from public.ear_tag_receipts
union all select 'caravanas', count(*) from public.ear_tags
union all select 'animales', count(*) from public.animals
union all select 'sesiones', count(*) from public.livestock_work_sessions
union all select 'importaciones CSV', count(*) from public.livestock_imports
union all select 'confirmaciones CSV', count(*) from public.gallagher_csv_confirmations
union all select 'trabajos', count(*) from public.professional_works
union all select 'facturas', count(*) from public.professional_invoices;
