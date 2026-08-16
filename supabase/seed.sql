-- Datos de demostración para Pablo Mendivil - campaña 2026/27.
-- Este archivo es idempotente: puede ejecutarse más de una vez.
-- No crea usuarios de Auth ni contiene credenciales.

begin;

-- Clientes reales en estructura, ficticios en identidad y datos fiscales.
insert into public.clients (id, legal_name, tax_id, contact_name, phone, email, active)
values
  ('10000000-0000-4000-8000-000000000001', 'Estancia La Esperanza S.A.', '30-00000001-1', 'Martín Arrieta', '+54 9 2281 555-101', 'administracion@laesperanza.demo', true),
  ('10000000-0000-4000-8000-000000000002', 'Agropecuaria El Ombú S.R.L.', '30-00000002-8', 'Sofía Ledesma', '+54 9 2281 555-202', 'sofia@elombu.demo', true),
  ('10000000-0000-4000-8000-000000000003', 'Sucesión de Roberto Ibarra', '20-00000003-4', 'Julián Ibarra', '+54 9 2284 555-303', 'julian@sanjorge.demo', true),
  ('10000000-0000-4000-8000-000000000004', 'María Inés Figueroa', '27-00000004-9', 'María Inés Figueroa', '+54 9 2494 555-404', 'maria@latolderia.demo', true)
on conflict (id) do update set
  legal_name = excluded.legal_name,
  tax_id = excluded.tax_id,
  contact_name = excluded.contact_name,
  phone = excluded.phone,
  email = excluded.email,
  active = excluded.active,
  updated_at = now();

insert into public.farms (id, client_id, name, service_mode, locality, province, active)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'La Esperanza', 'administracion_integral', 'Azul', 'Buenos Aires', true),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'El Ombú', 'veterinaria', 'Tapalqué', 'Buenos Aires', true),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'San Jorge', 'administracion_integral', 'Olavarría', 'Buenos Aires', true),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 'La Toldería', 'veterinaria', 'Tandil', 'Buenos Aires', true)
on conflict (id) do update set
  client_id = excluded.client_id,
  name = excluded.name,
  service_mode = excluded.service_mode,
  locality = excluded.locality,
  province = excluded.province,
  active = excluded.active,
  updated_at = now();

-- La campaña productiva se analiza de junio a junio.
insert into public.campaigns (id, farm_id, name, starts_on, ends_on, active)
values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '2026/27', '2026-06-01', '2027-05-31', true),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '2026/27', '2026-06-01', '2027-05-31', true),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', '2026/27', '2026-06-01', '2027-05-31', true),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000004', '2026/27', '2026-06-01', '2027-05-31', true)
on conflict (id) do update set name = excluded.name, starts_on = excluded.starts_on, ends_on = excluded.ends_on, active = excluded.active;

-- Superficies y usos representativos de sistemas mixtos del centro bonaerense.
insert into public.lots (id, farm_id, name, hectares, current_use, active)
values
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Lote 1 - La Loma', 182.50, 'Campo natural - rodeo de cría', true),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'Lote 2 - Bajo', 146.20, 'Pastura base festuca', true),
  ('40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'Lote 3 - Molino', 218.30, 'Verdeo de invierno', true),
  ('40000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 'Lote 4 - Ruta', 305.00, 'Maíz para silo', true),
  ('40000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', 'Lote 5 - Fondo', 598.00, 'Campo natural', true),

  ('40000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000002', 'Potrero Norte', 205.00, 'Recría sobre pastura', true),
  ('40000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000002', 'Potrero del Medio', 173.50, 'Verdeo de avena', true),
  ('40000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000002', 'Potrero Arroyo', 121.50, 'Campo natural', true),
  ('40000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000002', 'Agrícola', 380.00, 'Trigo / soja de segunda', true),

  ('40000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000003', 'Cuadro 1', 310.00, 'Rodeo de cría', true),
  ('40000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000003', 'Cuadro 2', 265.00, 'Recría', true),
  ('40000000-0000-4000-8000-000000000012', '20000000-0000-4000-8000-000000000003', 'Cuadro 3', 425.00, 'Soja de primera', true),
  ('40000000-0000-4000-8000-000000000013', '20000000-0000-4000-8000-000000000003', 'Cuadro 4', 390.00, 'Maíz', true),
  ('40000000-0000-4000-8000-000000000014', '20000000-0000-4000-8000-000000000003', 'Cuadro 5', 275.00, 'Trigo', true),
  ('40000000-0000-4000-8000-000000000015', '20000000-0000-4000-8000-000000000003', 'Bajos', 535.00, 'Campo natural y reserva', true),

  ('40000000-0000-4000-8000-000000000016', '20000000-0000-4000-8000-000000000004', 'La Manga', 94.00, 'Manejo y sanidad', true),
  ('40000000-0000-4000-8000-000000000017', '20000000-0000-4000-8000-000000000004', 'El Alto', 186.00, 'Rodeo de cría', true),
  ('40000000-0000-4000-8000-000000000018', '20000000-0000-4000-8000-000000000004', 'La Cañada', 160.00, 'Campo natural', true),
  ('40000000-0000-4000-8000-000000000019', '20000000-0000-4000-8000-000000000004', 'Chacra', 200.00, 'Pastura consociada', true)
on conflict (id) do update set name = excluded.name, hectares = excluded.hectares, current_use = excluded.current_use, active = excluded.active, updated_at = now();

-- Tropas activas. La categoría se obtiene por nombre para no depender de UUID generados.
insert into public.herds (id, farm_id, lot_id, category_id, name, active)
values
  ('50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', (select id from public.livestock_categories where name = 'Vaca'), 'Rodeo general de cría', true),
  ('50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003', (select id from public.livestock_categories where name = 'Vaquillona'), 'Vaquillonas de reposición', true),
  ('50000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000006', (select id from public.livestock_categories where name = 'Novillito'), 'Recría machos 2025', true),
  ('50000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000007', (select id from public.livestock_categories where name = 'Ternera'), 'Recría hembras', true),
  ('50000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000010', (select id from public.livestock_categories where name = 'Vaca'), 'Vacas CUT y generales', true),
  ('50000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000011', (select id from public.livestock_categories where name = 'Novillo'), 'Novillos terminación', true),
  ('50000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000017', (select id from public.livestock_categories where name = 'Vaca'), 'Rodeo Angus', true),
  ('50000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000019', (select id from public.livestock_categories where name = 'Ternero'), 'Terneros al pie', true)
on conflict (id) do update set lot_id = excluded.lot_id, category_id = excluded.category_id, name = excluded.name, active = excluded.active;

-- Una muestra de animales con seguimiento individual por caravana.
insert into public.animals (id, farm_id, herd_id, lot_id, category_id, tag_number, sex, birth_date, active)
values
  ('60000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', (select id from public.livestock_categories where name='Vaca'), 'AR-1842', 'hembra', '2021-09-18', true),
  ('60000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', (select id from public.livestock_categories where name='Vaca'), 'AR-1917', 'hembra', '2021-10-03', true),
  ('60000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000003', (select id from public.livestock_categories where name='Vaquillona'), 'AR-2381', 'hembra', '2024-08-29', true),
  ('60000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000006', (select id from public.livestock_categories where name='Novillito'), 'EO-5104', 'macho', '2025-09-11', true),
  ('60000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000006', (select id from public.livestock_categories where name='Novillito'), 'EO-5128', 'macho', '2025-09-19', true),
  ('60000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000010', (select id from public.livestock_categories where name='Vaca'), 'SJ-0721', 'hembra', '2020-10-07', true),
  ('60000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000011', (select id from public.livestock_categories where name='Novillo'), 'SJ-4408', 'macho', '2024-09-02', true),
  ('60000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000017', (select id from public.livestock_categories where name='Vaca'), 'LT-1302', 'hembra', '2022-08-22', true),
  ('60000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000008', '40000000-0000-4000-8000-000000000019', (select id from public.livestock_categories where name='Ternero'), 'LT-2614', 'macho', '2026-07-14', true),
  ('60000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000008', '40000000-0000-4000-8000-000000000019', (select id from public.livestock_categories where name='Ternera'), 'LT-2620', 'hembra', '2026-07-19', true)
on conflict (id) do update set herd_id = excluded.herd_id, lot_id = excluded.lot_id, category_id = excluded.category_id, tag_number = excluded.tag_number, active = excluded.active;

-- Movimientos consolidados que dan contexto productivo a la campaña.
-- El creador se toma del superadministrador existente.
insert into public.livestock_movements
  (id, farm_id, campaign_id, operation, status, occurred_on, animal_count, total_weight_kg, notes, created_by, confirmed_by, confirmed_at)
select v.id, v.farm_id, v.campaign_id, v.operation::public.livestock_operation,
       'confirmado'::public.record_status, v.occurred_on, v.animal_count, v.total_weight_kg,
       v.notes, p.id, p.id, v.occurred_on::timestamptz + interval '18 hours'
from (values
  ('70000000-0000-4000-8000-000000000001'::uuid, '20000000-0000-4000-8000-000000000001'::uuid, '30000000-0000-4000-8000-000000000001'::uuid, 'nacimiento', '2026-07-18'::date, 96, 3072.0, 'Primera recorrida de parición; peso estimado al nacimiento'),
  ('70000000-0000-4000-8000-000000000002'::uuid, '20000000-0000-4000-8000-000000000001'::uuid, '30000000-0000-4000-8000-000000000001'::uuid, 'traslado', '2026-08-02'::date, 142, 51830.0, 'Vacas preñadas trasladadas de La Loma al Bajo'),
  ('70000000-0000-4000-8000-000000000003'::uuid, '20000000-0000-4000-8000-000000000002'::uuid, '30000000-0000-4000-8000-000000000002'::uuid, 'compra', '2026-06-24'::date, 118, 22892.0, 'Ingreso de terneros para recría; promedio 194 kg'),
  ('70000000-0000-4000-8000-000000000004'::uuid, '20000000-0000-4000-8000-000000000002'::uuid, '30000000-0000-4000-8000-000000000002'::uuid, 'ajuste', '2026-08-08'::date, 118, 27612.0, 'Pesaje de control; promedio 234 kg'),
  ('70000000-0000-4000-8000-000000000005'::uuid, '20000000-0000-4000-8000-000000000003'::uuid, '30000000-0000-4000-8000-000000000003'::uuid, 'venta', '2026-07-29'::date, 74, 33670.0, 'Venta de novillos terminados; promedio 455 kg'),
  ('70000000-0000-4000-8000-000000000006'::uuid, '20000000-0000-4000-8000-000000000003'::uuid, '30000000-0000-4000-8000-000000000003'::uuid, 'muerte', '2026-08-05'::date, 2, null::numeric, 'Mortandad informada y revisada por veterinario'),
  ('70000000-0000-4000-8000-000000000007'::uuid, '20000000-0000-4000-8000-000000000004'::uuid, '30000000-0000-4000-8000-000000000004'::uuid, 'nacimiento', '2026-07-21'::date, 63, 1953.0, 'Avance de parición del rodeo Angus')
) as v(id, farm_id, campaign_id, operation, occurred_on, animal_count, total_weight_kg, notes)
cross join lateral (
  select id from public.profiles where role = 'super_admin' and active order by created_at limit 1
) p
on conflict (id) do update set
  operation = excluded.operation,
  status = excluded.status,
  occurred_on = excluded.occurred_on,
  animal_count = excluded.animal_count,
  total_weight_kg = excluded.total_weight_kg,
  notes = excluded.notes;

insert into public.health_events (id,farm_id,herd_id,event_type,title,scheduled_on,performed_on,status,animal_count,product,dose,notes,created_by)
select v.id,v.farm_id,v.herd_id,v.event_type::public.health_event_type,v.title,v.scheduled_on,v.performed_on,v.status::public.agenda_status,v.animal_count,v.product,v.dose,v.notes,p.id from (values
 ('80000000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000001'::uuid,'50000000-0000-4000-8000-000000000001'::uuid,'vacunacion','Vacunación reproductiva pre-servicio','2026-09-05'::date,null::date,'pendiente',142,'Bioabortogen H','2 ml','Aplicar a vacas y vaquillonas antes del servicio'),
 ('80000000-0000-4000-8000-000000000002'::uuid,'20000000-0000-4000-8000-000000000002'::uuid,'50000000-0000-4000-8000-000000000003'::uuid,'desparasitacion','Control parasitario de recría','2026-08-03'::date,'2026-08-03'::date,'realizado',118,'Ivermectina 1%','1 ml/50 kg','Tratamiento posterior al pesaje'),
 ('80000000-0000-4000-8000-000000000003'::uuid,'20000000-0000-4000-8000-000000000003'::uuid,'50000000-0000-4000-8000-000000000005'::uuid,'control','Revisión de condición corporal','2026-08-22'::date,null::date,'pendiente',205,null,null,'Priorizar vacas CUT y de condición menor a 3'),
 ('80000000-0000-4000-8000-000000000004'::uuid,'20000000-0000-4000-8000-000000000004'::uuid,'50000000-0000-4000-8000-000000000008'::uuid,'vacunacion','Clostridial de terneros','2026-08-28'::date,null::date,'pendiente',63,'Vacuna clostridial 7 vías','2 ml','Primera dosis; programar refuerzo')
) v(id,farm_id,herd_id,event_type,title,scheduled_on,performed_on,status,animal_count,product,dose,notes)
cross join lateral(select id from public.profiles where role='super_admin' and active order by created_at limit 1)p
on conflict(id) do update set title=excluded.title,scheduled_on=excluded.scheduled_on,status=excluded.status,notes=excluded.notes;

insert into public.reproductive_events (id,farm_id,herd_id,event_type,event_date,status,animal_count,result,notes,created_by)
select v.id,v.farm_id,v.herd_id,v.event_type::public.reproductive_event_type,v.event_date,'realizado'::public.agenda_status,v.animal_count,v.result,v.notes,p.id from (values
 ('90000000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000001'::uuid,'50000000-0000-4000-8000-000000000001'::uuid,'tacto','2026-06-18'::date,142,'91% preñez','Buen resultado; separar vacías'),
 ('90000000-0000-4000-8000-000000000002'::uuid,'20000000-0000-4000-8000-000000000003'::uuid,'50000000-0000-4000-8000-000000000005'::uuid,'tacto','2026-06-26'::date,205,'88% preñez','Revisar condición de vacas vacías'),
 ('90000000-0000-4000-8000-000000000003'::uuid,'20000000-0000-4000-8000-000000000004'::uuid,'50000000-0000-4000-8000-000000000008'::uuid,'parto','2026-07-21'::date,63,'63 nacimientos registrados','Avance normal de parición')
)v(id,farm_id,herd_id,event_type,event_date,animal_count,result,notes)
cross join lateral(select id from public.profiles where role='super_admin' and active order by created_at limit 1)p
on conflict(id) do update set result=excluded.result,notes=excluded.notes;

commit;
