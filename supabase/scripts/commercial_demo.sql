-- PABLO MENDIVIL - DEMOSTRACION COMERCIAL
-- Generado automaticamente. Reejecutable e idempotente.
-- Requiere que todas las migraciones esten aplicadas y un super_admin activo.

begin;

do $$
begin
  if to_regclass('public.livestock_decisions') is null
     or to_regclass('public.work_order_inputs') is null then
    raise exception 'Primero ejecute: npx supabase db push';
  end if;
  if not exists(select 1 from public.profiles where role='super_admin' and active) then
    raise exception 'La demo necesita un super administrador activo';
  end if;
end$$;

-- ===== FUENTE: supabase/seed.sql =====

-- Datos de demostración para Pablo Mendivil - campaña 2026/27.
-- Este archivo es idempotente: puede ejecutarse más de una vez.
-- No crea usuarios de Auth ni contiene credenciales.

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

-- ===== FUENTE: supabase/migrations/005_demo_health_data.sql =====

-- Datos ficticios de sanidad y reproducción para los cuatro campos demo.
-- Idempotente y condicionado a la existencia de un superadministrador.

insert into public.health_events
  (id,farm_id,herd_id,event_type,title,scheduled_on,performed_on,status,animal_count,product,dose,notes,created_by)
select v.id,v.farm_id,v.herd_id,v.event_type::public.health_event_type,v.title,v.scheduled_on,v.performed_on,
       v.status::public.agenda_status,v.animal_count,v.product,v.dose,v.notes,p.id
from (values
  -- La Esperanza, Azul
  ('81000000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000001'::uuid,'50000000-0000-4000-8000-000000000001'::uuid,'vacunacion','Vacunación reproductiva pre-servicio','2026-09-05'::date,null::date,'pendiente',142,'Bioabortogen H','2 ml','Aplicar a vacas y vaquillonas antes del servicio'),
  ('81000000-0000-4000-8000-000000000002'::uuid,'20000000-0000-4000-8000-000000000001'::uuid,'50000000-0000-4000-8000-000000000002'::uuid,'control','Revisión de condición corporal','2026-08-24'::date,null::date,'pendiente',58,null,null,'Clasificar vaquillonas antes del servicio'),
  ('81000000-0000-4000-8000-000000000003'::uuid,'20000000-0000-4000-8000-000000000001'::uuid,'50000000-0000-4000-8000-000000000001'::uuid,'desparasitacion','Desparasitación de otoño','2026-06-12'::date,'2026-06-12'::date,'realizado',142,'Ivermectina 1%','1 ml/50 kg','Sin reacciones adversas'),

  -- El Ombú, Tapalqué
  ('82000000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000002'::uuid,'50000000-0000-4000-8000-000000000003'::uuid,'desparasitacion','Control parasitario de recría','2026-08-03'::date,'2026-08-03'::date,'realizado',118,'Ivermectina 1%','1 ml/50 kg','Tratamiento posterior al pesaje'),
  ('82000000-0000-4000-8000-000000000002'::uuid,'20000000-0000-4000-8000-000000000002'::uuid,'50000000-0000-4000-8000-000000000004'::uuid,'vacunacion','Refuerzo clostridial recría hembras','2026-08-29'::date,null::date,'pendiente',84,'Clostridial 7 vías','2 ml','Segunda dosis del plan'),
  ('82000000-0000-4000-8000-000000000003'::uuid,'20000000-0000-4000-8000-000000000002'::uuid,'50000000-0000-4000-8000-000000000003'::uuid,'diagnostico','Control de bosta y HPG','2026-09-12'::date,null::date,'pendiente',25,null,null,'Muestreo representativo de la tropa'),

  -- San Jorge, Olavarría
  ('83000000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000003'::uuid,'50000000-0000-4000-8000-000000000005'::uuid,'control','Revisión de condición corporal','2026-08-22'::date,null::date,'pendiente',205,null,null,'Priorizar vacas CUT y condición menor a 3'),
  ('83000000-0000-4000-8000-000000000002'::uuid,'20000000-0000-4000-8000-000000000003'::uuid,'50000000-0000-4000-8000-000000000006'::uuid,'tratamiento','Tratamiento de queratoconjuntivitis','2026-08-10'::date,'2026-08-10'::date,'realizado',6,'Oxitetraciclina LA','Según peso','Animales identificados y apartados'),
  ('83000000-0000-4000-8000-000000000003'::uuid,'20000000-0000-4000-8000-000000000003'::uuid,'50000000-0000-4000-8000-000000000005'::uuid,'vacunacion','Vacunación contra carbunclo','2026-10-02'::date,null::date,'pendiente',205,'Vacuna anticarbunclosa','2 ml','Coordinar con manga y personal'),

  -- La Toldería, Tandil
  ('84000000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000004'::uuid,'50000000-0000-4000-8000-000000000008'::uuid,'vacunacion','Clostridial de terneros','2026-08-28'::date,null::date,'pendiente',63,'Clostridial 7 vías','2 ml','Primera dosis; programar refuerzo'),
  ('84000000-0000-4000-8000-000000000002'::uuid,'20000000-0000-4000-8000-000000000004'::uuid,'50000000-0000-4000-8000-000000000007'::uuid,'control','Recorrida de parición','2026-08-18'::date,null::date,'pendiente',96,null,null,'Revisar vacas próximas y registrar nacimientos'),
  ('84000000-0000-4000-8000-000000000003'::uuid,'20000000-0000-4000-8000-000000000004'::uuid,'50000000-0000-4000-8000-000000000007'::uuid,'vacunacion','Vacunación reproductiva anual','2026-06-20'::date,'2026-06-20'::date,'realizado',96,'Vacuna reproductiva','2 ml','Aplicación completa sin novedades')
) v(id,farm_id,herd_id,event_type,title,scheduled_on,performed_on,status,animal_count,product,dose,notes)
cross join lateral (
  select id from public.profiles where role='super_admin' and active order by created_at limit 1
) p
on conflict(id) do update set
  title=excluded.title,scheduled_on=excluded.scheduled_on,performed_on=excluded.performed_on,
  status=excluded.status,animal_count=excluded.animal_count,product=excluded.product,dose=excluded.dose,notes=excluded.notes;

insert into public.reproductive_events
  (id,farm_id,herd_id,event_type,event_date,status,animal_count,result,notes,created_by)
select v.id,v.farm_id,v.herd_id,v.event_type::public.reproductive_event_type,v.event_date,
       v.status::public.agenda_status,v.animal_count,v.result,v.notes,p.id
from (values
  -- La Esperanza
  ('91000000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000001'::uuid,'50000000-0000-4000-8000-000000000001'::uuid,'tacto','2026-06-18'::date,'realizado',142,'91% preñez','Separadas 13 vacías para evaluación'),
  ('91000000-0000-4000-8000-000000000002'::uuid,'20000000-0000-4000-8000-000000000001'::uuid,'50000000-0000-4000-8000-000000000001'::uuid,'parto','2026-07-18'::date,'realizado',96,'96 nacimientos registrados','Parición dentro de parámetros esperados'),
  -- El Ombú
  ('92000000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000002'::uuid,'50000000-0000-4000-8000-000000000004'::uuid,'tacto','2026-07-02'::date,'realizado',84,'Selección de 52 vientres','Aptas para futura reposición'),
  ('92000000-0000-4000-8000-000000000002'::uuid,'20000000-0000-4000-8000-000000000002'::uuid,'50000000-0000-4000-8000-000000000004'::uuid,'servicio','2026-11-01'::date,'pendiente',52,'Servicio programado','Definir toros y duración del servicio'),
  -- San Jorge
  ('93000000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000003'::uuid,'50000000-0000-4000-8000-000000000005'::uuid,'tacto','2026-06-26'::date,'realizado',205,'88% preñez','Revisar condición de vacas vacías'),
  ('93000000-0000-4000-8000-000000000002'::uuid,'20000000-0000-4000-8000-000000000003'::uuid,'50000000-0000-4000-8000-000000000005'::uuid,'servicio','2026-10-20'::date,'pendiente',180,'Servicio estacionado','Duración prevista de 90 días'),
  -- La Toldería
  ('94000000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000004'::uuid,'50000000-0000-4000-8000-000000000008'::uuid,'parto','2026-07-21'::date,'realizado',63,'63 nacimientos registrados','Avance normal de parición'),
  ('94000000-0000-4000-8000-000000000002'::uuid,'20000000-0000-4000-8000-000000000004'::uuid,'50000000-0000-4000-8000-000000000008'::uuid,'destete','2027-03-15'::date,'pendiente',63,'Destete programado','Ajustar fecha según peso promedio')
) v(id,farm_id,herd_id,event_type,event_date,status,animal_count,result,notes)
cross join lateral (
  select id from public.profiles where role='super_admin' and active order by created_at limit 1
) p
on conflict(id) do update set
  event_date=excluded.event_date,status=excluded.status,animal_count=excluded.animal_count,
  result=excluded.result,notes=excluded.notes;

-- ===== FUENTE: supabase/migrations/007_demo_expenses.sql =====

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

-- ===== FUENTE: supabase/migrations/009_demo_performance.sql =====

insert into public.campaign_performance(id,farm_id,campaign_id,productive_hectares,opening_weight_kg,closing_weight_kg,purchases_weight_kg,sales_weight_kg,transfers_in_kg,transfers_out_kg,livestock_revenue_ars,stock_variation_ars,livestock_direct_cost_ars,agriculture_revenue_ars,agriculture_direct_cost_ars,cash_balance_ars,target_kg_ha,target_margin_ha_ars,updated_by)
select v.id,v.farm_id,v.campaign_id,v.ha,v.opening,v.closing,v.purchases,v.sales,0,v.transfers_out,v.livestock_revenue,v.stock_variation,v.livestock_cost,v.agri_revenue,v.agri_cost,v.cash,v.target_kg,v.target_margin,p.id from(values
 ('c1000000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000001'::uuid,'30000000-0000-4000-8000-000000000001'::uuid,1145::numeric,186400,258070,0,33670,0,68200000,12400000,29400000,48600000,32100000,8200000,92,52000),
 ('c2000000-0000-4000-8000-000000000002'::uuid,'20000000-0000-4000-8000-000000000002'::uuid,'30000000-0000-4000-8000-000000000002'::uuid,500::numeric,41200,99892,22892,0,0,0,9800000,12100000,0,0,-4200000,78,38000),
 ('c3000000-0000-4000-8000-000000000003'::uuid,'20000000-0000-4000-8000-000000000003'::uuid,'30000000-0000-4000-8000-000000000003'::uuid,1385::numeric,246800,343320,0,33670,0,73500000,18200000,34700000,126000000,84700000,15700000,88,65000),
 ('c4000000-0000-4000-8000-000000000004'::uuid,'20000000-0000-4000-8000-000000000004'::uuid,'30000000-0000-4000-8000-000000000004'::uuid,640::numeric,98500,154820,0,0,0,0,13600000,15400000,0,0,-1800000,85,42000)
)v(id,farm_id,campaign_id,ha,opening,closing,purchases,sales,transfers_out,livestock_revenue,stock_variation,livestock_cost,agri_revenue,agri_cost,cash,target_kg,target_margin)
cross join lateral(select id from public.profiles where role='super_admin' and active order by created_at limit 1)p
on conflict(farm_id,campaign_id) do update set closing_weight_kg=excluded.closing_weight_kg,livestock_revenue_ars=excluded.livestock_revenue_ars,stock_variation_ars=excluded.stock_variation_ars,livestock_direct_cost_ars=excluded.livestock_direct_cost_ars,agriculture_revenue_ars=excluded.agriculture_revenue_ars,agriculture_direct_cost_ars=excluded.agriculture_direct_cost_ars,cash_balance_ars=excluded.cash_balance_ars,updated_at=now();

-- ===== FUENTE: supabase/migrations/011_demo_valuations.sql =====

insert into public.exchange_rates(id,rate_date,ars_per_usd,source_note,created_by)
select 'd1000000-0000-4000-8000-000000000001', '2026-08-15', 1385, 'Tipo de cambio manual de referencia para gestión', p.id from public.profiles p where p.role='super_admin' and p.active order by p.created_at limit 1
on conflict(rate_date) do update set ars_per_usd=excluded.ars_per_usd,source_note=excluded.source_note;
insert into public.category_valuations(id,farm_id,campaign_id,category_id,valuation_date,price_per_kg_ars,created_by)
select gen_random_uuid(),f.id,c.id,lc.id,'2026-08-15',case lc.name when 'Vaca' then 2850 when 'Vaquillona' then 3200 when 'Ternero' then 4100 when 'Ternera' then 3950 when 'Novillo' then 3600 when 'Novillito' then 3750 when 'Toro' then 2450 else 3000 end,p.id
from public.farms f join public.campaigns c on c.farm_id=f.id and c.active cross join public.livestock_categories lc cross join lateral(select id from public.profiles where role='super_admin' and active order by created_at limit 1)p
on conflict(farm_id,campaign_id,category_id,valuation_date) do update set price_per_kg_ars=excluded.price_per_kg_ars;

-- ===== FUENTE: supabase/migrations/013_demo_income_sales.sql =====

insert into public.income_sales(id,farm_id,campaign_id,lot_id,sale_date,activity,product,buyer,quantity,unit,unit_price,currency,exchange_rate,commission_amount,freight_amount,other_deductions,status,collected_amount,document_number,notes,created_by)
select v.id,v.farm_id,v.campaign_id,v.lot_id,v.sale_date,v.activity::public.production_activity,v.product,v.buyer,v.quantity,v.unit,v.unit_price,v.currency::public.money_currency,v.exchange_rate,v.commission,v.freight,v.other_deductions,v.status::public.sale_status,v.collected,v.document,v.notes,p.id
from(values
 ('d1000000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000001'::uuid,'30000000-0000-4000-8000-000000000001'::uuid,null::uuid,'2026-07-16'::date,'ganaderia','Vacas conserva y manufactura','Frigorífico Azul',18450::numeric,'kg',3380::numeric,'ARS',1::numeric,1860000::numeric,940000::numeric,0::numeric,'cobrado',59561000::numeric,'LIQ-FA-0716','18 vacas de descarte; 1.025 kg promedio de res por lote'),
 ('d1000000-0000-4000-8000-000000000002'::uuid,'20000000-0000-4000-8000-000000000001'::uuid,'30000000-0000-4000-8000-000000000001'::uuid,'40000000-0000-4000-8000-000000000004'::uuid,'2026-08-07'::date,'agricultura','Maíz disponible','ACA Azul',168::numeric,'tn',281000::numeric,'ARS',1::numeric,236040::numeric,3192000::numeric,0::numeric,'parcial',25000000::numeric,'C1116A-2841','Precio de referencia pizarra Rosario; flete Azul-Rosario estimado'),
 ('d2000000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000002'::uuid,'30000000-0000-4000-8000-000000000002'::uuid,'40000000-0000-4000-8000-000000000006'::uuid,'2026-08-10'::date,'ganaderia','Novillitos recriados 300-350 kg','Consignataria Wallace',32980::numeric,'kg',4780::numeric,'ARS',1::numeric,4729320::numeric,1150000::numeric,0::numeric,'parcial',79000000::numeric,'LIQ-W-8214','98 cabezas; peso promedio 336,5 kg'),
 ('d3000000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000003'::uuid,'30000000-0000-4000-8000-000000000003'::uuid,'40000000-0000-4000-8000-000000000011'::uuid,'2026-07-29'::date,'ganaderia','Novillos terminados','Frigorífico Rioplatense',33670::numeric,'kg',4353::numeric,'ARS',1::numeric,4396905::numeric,1380000::numeric,0::numeric,'cobrado',140785005::numeric,'LIQ-FR-729','74 cabezas; 455 kg vivo promedio'),
 ('d3000000-0000-4000-8000-000000000002'::uuid,'20000000-0000-4000-8000-000000000003'::uuid,'30000000-0000-4000-8000-000000000003'::uuid,'40000000-0000-4000-8000-000000000012'::uuid,'2026-08-05'::date,'agricultura','Soja de primera','Cargill Quequén',285::numeric,'tn',505000::numeric,'ARS',1::numeric,719625::numeric,6270000::numeric,420000::numeric,'parcial',90000000::numeric,'C1116B-9052','Precio pizarra Rosario; descuentos y flete estimados'),
 ('d3000000-0000-4000-8000-000000000003'::uuid,'20000000-0000-4000-8000-000000000003'::uuid,'30000000-0000-4000-8000-000000000003'::uuid,'40000000-0000-4000-8000-000000000014'::uuid,'2026-08-12'::date,'agricultura','Trigo pan','Molinos Tandil',132::numeric,'tn',307800::numeric,'ARS',1::numeric,203148::numeric,2244000::numeric,0::numeric,'pendiente',0::numeric,'C1116A-9177','Precio pizarra Rosario; calidad contractual estándar'),
 ('d4000000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000004'::uuid,'30000000-0000-4000-8000-000000000004'::uuid,'40000000-0000-4000-8000-000000000019'::uuid,'2026-08-13'::date,'ganaderia','Terneros 160-180 kg','Campos y Ganados Tandil',10920::numeric,'kg',5893::numeric,'ARS',1::numeric,1930417::numeric,685000::numeric,0::numeric,'pendiente',0::numeric,'LIQ-CGT-413','63 terneros; 173 kg promedio')
)v(id,farm_id,campaign_id,lot_id,sale_date,activity,product,buyer,quantity,unit,unit_price,currency,exchange_rate,commission,freight,other_deductions,status,collected,document,notes)
cross join lateral(select id from public.profiles where role='super_admin' and active order by created_at limit 1)p
on conflict(id) do update set unit_price=excluded.unit_price,status=excluded.status,collected_amount=excluded.collected_amount,notes=excluded.notes;

update public.expenses set campaign_id=case farm_id when '20000000-0000-4000-8000-000000000001' then '30000000-0000-4000-8000-000000000001'::uuid when '20000000-0000-4000-8000-000000000002' then '30000000-0000-4000-8000-000000000002'::uuid when '20000000-0000-4000-8000-000000000003' then '30000000-0000-4000-8000-000000000003'::uuid when '20000000-0000-4000-8000-000000000004' then '30000000-0000-4000-8000-000000000004'::uuid end,
activity=case when category='Agricultura' then 'agricultura'::public.production_activity when category='Sanidad' or concept ilike '%manga%' then 'ganaderia'::public.production_activity else 'general'::public.production_activity end
where id::text like 'b%';

-- ===== FUENTE: supabase/migrations/015_demo_operations_and_allocations.sql =====

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

-- ===== FUENTE: supabase/migrations/017_demo_agricultural_yields.sql =====

insert into public.agricultural_cycles(id,farm_id,campaign_id,lot_id,crop,variety,sown_hectares,harvested_hectares,sowing_date,harvest_date,target_yield_kg_ha,produced_tons,sold_tons,livestock_feed_tons,other_use_tons,reference_price_ars_ton,status,notes,created_by)
select v.id,v.farm_id,v.campaign_id,v.lot_id,v.crop,v.variety,v.sown_ha,v.harvested_ha,v.sowing_date,v.harvest_date,v.target_yield,v.produced,v.sold,v.feed,v.other_use,v.reference_price,v.status::public.crop_cycle_status,v.notes,p.id
from(values
('f1000000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000001'::uuid,'30000000-0000-4000-8000-000000000001'::uuid,'40000000-0000-4000-8000-000000000004'::uuid,'Maíz para alimentación','Híbrido templado',305::numeric,305::numeric,'2025-10-18'::date,'2026-04-22'::date,8200::numeric,2348.5::numeric,168::numeric,0::numeric,0::numeric,281000::numeric,'cosechado','Grano propio; parte destinada a suplementación ganadera'),
('f3000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000012','Soja de primera','Grupo IV corto',425,425,'2025-11-05','2026-04-28',3400,1402.5,285,0,0,505000,'cosechado','Rinde parejo; parte de la producción permanece almacenada'),
('f3000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000013','Maíz','Híbrido VT3P',390,0,'2026-08-02',null,8500,0,0,0,0,281000,'implantado','Campaña nueva; labores de implantación en curso'),
('f3000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000014','Trigo pan','Baguette 620',275,275,'2025-06-24','2025-12-18',4600,1237.5,132,0,0,307800,'cosechado','Calidad comercial estándar; saldo en acopio')
)v(id,farm_id,campaign_id,lot_id,crop,variety,sown_ha,harvested_ha,sowing_date,harvest_date,target_yield,produced,sold,feed,other_use,reference_price,status,notes)
cross join lateral(select id from public.profiles where role='super_admin' and active order by created_at limit 1)p
on conflict(campaign_id,lot_id,crop)do update set produced_tons=excluded.produced_tons,sold_tons=excluded.sold_tons,livestock_feed_tons=excluded.livestock_feed_tons,reference_price_ars_ton=excluded.reference_price_ars_ton,status=excluded.status;

update public.field_operations set agricultural_cycle_id='f1000000-0000-4000-8000-000000000001' where id='e1000000-0000-4000-8000-000000000002';
update public.field_operations set agricultural_cycle_id='f3000000-0000-4000-8000-000000000002' where id='e3000000-0000-4000-8000-000000000001';

-- ===== FUENTE: supabase/migrations/019_demo_livestock_cycles.sql =====

insert into public.livestock_cycles(id,farm_id,campaign_id,herd_id,lot_id,stage,starts_on,ends_on,assigned_hectares,opening_heads,opening_weight_kg,opening_price_ars_kg,purchased_heads,purchased_weight_kg,purchase_cost_ars,sold_heads,sold_weight_kg,deaths_heads,closing_heads,closing_weight_kg,closing_price_ars_kg,target_adg_kg,target_kg_ha,status,notes,created_by)
select v.id,v.farm_id,v.campaign_id,v.herd_id,v.lot_id,v.stage::public.livestock_cycle_stage,v.starts_on,v.ends_on,v.hectares,v.opening_heads,v.opening_weight,v.opening_price,v.purchased_heads,v.purchased_weight,v.purchase_cost,v.sold_heads,v.sold_weight,v.deaths,v.closing_heads,v.closing_weight,v.closing_price,v.target_adg,v.target_kg_ha,v.status::public.livestock_cycle_status,v.notes,p.id from(values
('aa100000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000001'::uuid,'30000000-0000-4000-8000-000000000001'::uuid,'50000000-0000-4000-8000-000000000001'::uuid,'40000000-0000-4000-8000-000000000001'::uuid,'cria','2026-06-01'::date,null::date,328.7::numeric,142,59640::numeric,3650::numeric,0,0::numeric,0::numeric,18,18450::numeric,1,123,54420::numeric,4100::numeric,.450::numeric,92::numeric,'activo','Rodeo de cría; descarte de vacas y avance de parición'),
('aa200000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000006','recria','2026-06-24',null,205,0,0,0,118,22892,134900000,0,0,0,118,27612,4780,.650,78,'activo','Recría pastoril comprada; control de peso de agosto'),
('aa300000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000006','40000000-0000-4000-8000-000000000011','terminacion','2026-06-01','2026-07-29',265,74,28860,3900,0,0,0,74,33670,0,0,0,0,.900,88,'cerrado','Novillos vendidos con 455 kg promedio'),
('aa400000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000004','50000000-0000-4000-8000-000000000007','40000000-0000-4000-8000-000000000017','cria','2026-06-01',null,346,96,40320,3650,0,0,0,0,0,0,96,43200,4100,.400,85,'activo','Rodeo Angus en parición')
)v(id,farm_id,campaign_id,herd_id,lot_id,stage,starts_on,ends_on,hectares,opening_heads,opening_weight,opening_price,purchased_heads,purchased_weight,purchase_cost,sold_heads,sold_weight,deaths,closing_heads,closing_weight,closing_price,target_adg,target_kg_ha,status,notes)
cross join lateral(select id from public.profiles where role='super_admin' and active order by created_at limit 1)p on conflict(campaign_id,herd_id)do update set closing_heads=excluded.closing_heads,closing_weight_kg=excluded.closing_weight_kg,status=excluded.status;
update public.income_sales set herd_id='50000000-0000-4000-8000-000000000001' where id='d1000000-0000-4000-8000-000000000001';
update public.income_sales set herd_id='50000000-0000-4000-8000-000000000003' where id='d2000000-0000-4000-8000-000000000001';
update public.income_sales set herd_id='50000000-0000-4000-8000-000000000006' where id='d3000000-0000-4000-8000-000000000001';
insert into public.feed_transfers(id,agricultural_cycle_id,livestock_cycle_id,transfer_date,tons,price_ars_ton,notes,created_by)
select 'ab100000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','aa100000-0000-4000-8000-000000000001','2026-07-31',128,281000,'Maíz propio destinado al rodeo; transferencia interna sin duplicar resultado',p.id from public.profiles p where p.role='super_admin' and p.active order by p.created_at limit 1 on conflict(id)do update set tons=excluded.tons,price_ars_ton=excluded.price_ars_ton;
update public.agricultural_cycles set livestock_feed_tons=128 where id='f1000000-0000-4000-8000-000000000001';

-- ===== FUENTE: supabase/migrations/021_demo_multi_lot_work_orders.sql =====

insert into public.field_operations(id,farm_id,campaign_id,activity,operation_date,name,operation_type,worked_hectares,contractor,status,notes,created_by)
select 'ec300000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003','agricultura','2026-08-14','Pulverización de barbecho','Pulverización',665,'Servicios Rurales Gómez','realizada','Aplicación conjunta en dos cuadros; carga demostrativa multilote',p.id from public.profiles p where p.role='super_admin'and p.active order by p.created_at limit 1 on conflict(id)do nothing;
insert into public.field_operation_lots(operation_id,lot_id,agricultural_cycle_id,worked_hectares,cost_percentage)values
('ec300000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000013','f3000000-0000-4000-8000-000000000002',390,58.6466),
('ec300000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000014','f3000000-0000-4000-8000-000000000003',275,41.3534)
on conflict(operation_id,lot_id)do update set worked_hectares=excluded.worked_hectares,cost_percentage=excluded.cost_percentage;

-- ===== FUENTE: supabase/migrations/023_demo_work_catalog.sql =====

insert into public.work_type_catalog(id,name,activity,default_rate_ars_ha,description,created_by)select v.id,v.name,v.activity::public.production_activity,v.rate,v.description,p.id from(values('ad100000-0000-4000-8000-000000000001'::uuid,'Barbecho químico','agricultura',28500::numeric,'Aplicación sin productos'),('ad100000-0000-4000-8000-000000000002','Siembra directa','agricultura',78000,'Servicio sin semilla ni fertilizante'),('ad100000-0000-4000-8000-000000000003','Pulverización','agricultura',24500,'Aplicación terrestre sin productos'),('ad100000-0000-4000-8000-000000000004','Fertilización','agricultura',31000,'Aplicación sin fertilizante'),('ad100000-0000-4000-8000-000000000005','Cosecha de granos','agricultura',118000,'Servicio orientativo por hectárea'),('ad100000-0000-4000-8000-000000000006','Confección de reservas','agricultura',165000,'Picado y confección; ajustar por distancia'),('ad100000-0000-4000-8000-000000000007','Trabajo de manga','ganaderia',0,'Cotizar por jornada o cabeza'),('ad100000-0000-4000-8000-000000000008','Mantenimiento de alambrados','general',42000,'Valor equivalente por hectárea intervenida'))v(id,name,activity,rate,description)cross join lateral(select id from public.profiles where role='super_admin'and active order by created_at limit 1)p on conflict(name)do update set default_rate_ars_ha=excluded.default_rate_ars_ha,description=excluded.description;
update public.field_operations o set work_type_id=w.id,rate_ars_ha=w.default_rate_ars_ha,planned_cost_ars=o.worked_hectares*w.default_rate_ars_ha from public.work_type_catalog w where lower(o.operation_type)=lower(w.name)or(lower(o.operation_type)='siembra'and w.name='Siembra directa');

-- ===== FUENTE: supabase/migrations/025_demo_august_position.sql =====

insert into public.crop_stands(id,farm_id,campaign_id,lot_id,crop,hectares,sowing_date,phenological_stage,condition,target_yield_kg_ha,projected_yield_kg_ha,next_action,next_action_date,executed_cost_ars,committed_cost_ars,notes,created_by)select v.id,v.farm_id,v.campaign_id,v.lot_id,v.crop,v.ha,v.sowing,v.stage,v.condition,v.target,v.projected,v.next_action,v.next_date,v.executed,v.committed,v.notes,p.id from(values
('ba100000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000001'::uuid,'30000000-0000-4000-8000-000000000001'::uuid,'40000000-0000-4000-8000-000000000003'::uuid,'Trigo',218.3::numeric,'2026-06-22'::date,'Macollaje','buena',4600::numeric,4450::numeric,'Refertilización nitrogenada','2026-08-24'::date,31800000::numeric,12400000::numeric,'Implantación pareja; revisar sectores bajos'),
('ba300000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000014','Trigo',275,'2026-06-24','Macollaje','muy_buena',4700,4850,'Aplicación de nitrógeno y monitoreo de roya','2026-08-21',42500000,18600000,'Buen número de plantas y humedad adecuada'),
('ba300000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000015','Cebada cervecera',310,'2026-07-08','Tres hojas','buena',5100,4900,'Control de malezas y primera recorrida sanitaria','2026-08-19',39700000,15200000,'Contrato comercial a definir según proteína objetivo')
)v(id,farm_id,campaign_id,lot_id,crop,ha,sowing,stage,condition,target,projected,next_action,next_date,executed,committed,notes)cross join lateral(select id from public.profiles where role='super_admin'and active order by created_at limit 1)p on conflict(campaign_id,lot_id,crop)do update set phenological_stage=excluded.phenological_stage,condition=excluded.condition,projected_yield_kg_ha=excluded.projected_yield_kg_ha,next_action=excluded.next_action,next_action_date=excluded.next_action_date,executed_cost_ars=excluded.executed_cost_ars,committed_cost_ars=excluded.committed_cost_ars;
insert into public.inventory_batches(id,farm_id,product,origin_campaign,origin_lot,storage_location,opening_tons,sold_tons,consumed_tons,reserved_tons,price_ars_ton,quality_note,created_by)select v.id,v.farm_id,v.product,v.campaign,v.lot,v.storage,v.opening,v.sold,v.consumed,v.reserved,v.price,v.quality,p.id from(values
('bb100000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000001'::uuid,'Maíz','2025/26','Lote 4 - Ruta','Silo bolsa norte',420::numeric,80::numeric,38::numeric,160::numeric,281000::numeric,'Humedad 14,2%; reservado para suplementación'),
('bb300000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','Maíz','2025/26','Cuadro 4','Planta de silos',510,168,42,95,281000,'Calidad comercial; parte comprometida para terminación'),
('bb300000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003','Soja','2025/26','Cuadro 3','Acopio Olavarría',330,285,0,0,505000,'Saldo disponible con gastos de almacenaje')
)v(id,farm_id,product,campaign,lot,storage,opening,sold,consumed,reserved,price,quality)cross join lateral(select id from public.profiles where role='super_admin'and active order by created_at limit 1)p on conflict(id)do update set sold_tons=excluded.sold_tons,consumed_tons=excluded.consumed_tons,reserved_tons=excluded.reserved_tons,price_ars_ton=excluded.price_ars_ton;
insert into public.financial_commitments(id,farm_id,due_date,direction,concept,counterparty,amount_ars,status,created_by)select v.id,v.farm_id,v.due_date,v.direction,v.concept,v.counterparty,v.amount,'pendiente',p.id from(values
('bc100000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000001'::uuid,'2026-08-25'::date,'pagar','Fertilizante nitrogenado trigo','Agroinsumos del Centro',12400000::numeric),
('bc100000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','2026-08-29','cobrar','Saldo venta de maíz','ACA Azul',19000000),
('bc300000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','2026-08-22','pagar','Fertilización trigo y cebada','Agroinsumos del Centro',33800000),
('bc300000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003','2026-08-31','cobrar','Saldo soja entregada','Cargill Quequén',43711625)
)v(id,farm_id,due_date,direction,concept,counterparty,amount)cross join lateral(select id from public.profiles where role='super_admin'and active order by created_at limit 1)p on conflict(id)do update set amount_ars=excluded.amount_ars,status='pendiente';

-- ===== FUENTE: supabase/migrations/027_demo_management_control.sql =====

insert into public.management_budgets(id,farm_id,campaign_id,activity,budget_revenue_ars,budget_cost_ars,forecast_revenue_ars,forecast_cost_ars,assumption_note,updated_by)select v.id,v.farm_id,v.campaign_id,v.activity::public.production_activity,v.budget_revenue,v.budget_cost,v.forecast_revenue,v.forecast_cost,v.note,p.id from(values
('ca100000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000001'::uuid,'30000000-0000-4000-8000-000000000001'::uuid,'ganaderia',310000000::numeric,225000000::numeric,326000000::numeric,246000000::numeric,'Mejor precio de descarte; mayor costo de suplementación'),
('ca100000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','agricultura',298000000,191000000,287000000,207000000,'Trigo proyectado 3% debajo del objetivo y fertilización sobre presupuesto'),
('ca200000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','ganaderia',245000000,188000000,252000000,198000000,'Recría con buena GDP; compra inicial más cara'),
('ca300000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003','agricultura',612000000,421000000,635000000,459000000,'Mejor proyección de trigo; aumento de fertilización'),
('ca300000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003','ganaderia',395000000,286000000,407000000,301000000,'Precio de novillo favorable; alimentación comprometida'),
('ca400000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000004','ganaderia',186000000,142000000,181000000,151000000,'Servicio veterinario; menor producción proyectada por hectárea')
)v(id,farm_id,campaign_id,activity,budget_revenue,budget_cost,forecast_revenue,forecast_cost,note)cross join lateral(select id from public.profiles where role='super_admin'and active order by created_at limit 1)p on conflict(farm_id,campaign_id,activity)do update set forecast_revenue_ars=excluded.forecast_revenue_ars,forecast_cost_ars=excluded.forecast_cost_ars,assumption_note=excluded.assumption_note;
insert into public.monthly_closures(id,farm_id,period_start,livestock_reconciled,inventory_reconciled,crops_updated,work_orders_updated,expenses_allocated,sales_updated,cash_reconciled,projections_reviewed,status,notes,updated_by)select gen_random_uuid(),f.id,'2026-08-01',true,(f.name in('San Jorge','La Esperanza')),true,true,(f.name='San Jorge'),true,false,false,'en_revision','Cierre demostrativo al 16 de agosto',p.id from public.farms f cross join lateral(select id from public.profiles where role='super_admin'and active order by created_at limit 1)p on conflict(farm_id,period_start)do nothing;

-- ===== FUENTE: supabase/migrations/029_demo_inventory_ledger.sql =====

insert into public.inventory_items(id,farm_id,name,kind,unit,location,origin_campaign,opening_quantity,minimum_quantity,unit_value_ars,physical_count,counted_at,created_by)select v.id,v.farm_id,v.name,v.kind::public.inventory_kind,v.unit,v.location,v.campaign,v.opening,v.minimum,v.value,v.physical,'2026-08-15',p.id from(values
('da100000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000001'::uuid,'Maíz grano','grano','tn','Silo bolsa norte','2025/26',420::numeric,60::numeric,281000::numeric,301::numeric),
('da100000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','Urea granulada','fertilizante','kg','Galpón de insumos',null,52000,5000,1130,10370),
('da100000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','Gasoil','combustible','litros','Tanque principal',null,8200,2500,1750,7850),
('da300000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','Maíz grano','grano','tn','Planta de silos','2025/26',510,80,281000,299),
('da300000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003','Soja','grano','tn','Acopio Olavarría','2025/26',330,0,505000,44.5),
('da300000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003','Urea granulada','fertilizante','kg','Galpón principal',null,46000,8000,1130,45500),
('da400000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000004','Vacuna clostridial','veterinario','dosis','Botiquín veterinario',null,180,70,4250,176)
)v(id,farm_id,name,kind,unit,location,campaign,opening,minimum,value,physical)cross join lateral(select id from public.profiles where role='super_admin'and active order by created_at limit 1)p on conflict(farm_id,name,location)do update set physical_count=excluded.physical_count,counted_at=excluded.counted_at,unit_value_ars=excluded.unit_value_ars;
insert into public.inventory_movements(id,item_id,movement_date,movement_type,quantity,concept,reference,created_by)select gen_random_uuid(),v.item_id,v.date,v.type::public.inventory_movement_type,v.quantity,v.concept,v.reference,p.id from(values
('da100000-0000-4000-8000-000000000001'::uuid,'2026-07-20'::date,'egreso',80::numeric,'Venta de maíz','C1116A-2841'),('da100000-0000-4000-8000-000000000001','2026-07-31','egreso',38,'Consumo ganadero julio','Transferencia interna'),('da100000-0000-4000-8000-000000000001','2026-08-01','reserva',160,'Reserva para suplementación','Plan alimenticio'),('da100000-0000-4000-8000-000000000002','2026-08-10','egreso',41250,'Fertilización de trigo','Orden refertilización'),('da300000-0000-4000-8000-000000000001','2026-08-05','egreso',168,'Venta de maíz','C1116A-9052'),('da300000-0000-4000-8000-000000000001','2026-08-12','egreso',42,'Consumo terminación','Transferencia interna'),('da300000-0000-4000-8000-000000000001','2026-08-01','reserva',95,'Reserva para novillos','Plan alimenticio'),('da300000-0000-4000-8000-000000000002','2026-08-05','egreso',285,'Venta de soja','C1116B-9052'))v(item_id,date,type,quantity,concept,reference)cross join lateral(select id from public.profiles where role='super_admin'and active order by created_at limit 1)p;

-- ===== FUENTE: supabase/migrations/031_demo_order_supplies.sql =====

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

-- ===== FUENTE: supabase/migrations/033_demo_campaign_2025_26.sql =====

-- Campaña histórica cerrada para análisis comparativo. Valores nominales de cierre.
insert into public.campaigns(id,farm_id,name,starts_on,ends_on,active) values
('31000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','2025/26','2025-06-01','2026-05-31',false),
('31000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','2025/26','2025-06-01','2026-05-31',false),
('31000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003','2025/26','2025-06-01','2026-05-31',false),
('31000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000004','2025/26','2025-06-01','2026-05-31',false)
on conflict(farm_id,name)do update set starts_on=excluded.starts_on,ends_on=excluded.ends_on,active=false;

insert into public.campaign_performance(id,farm_id,campaign_id,productive_hectares,opening_weight_kg,closing_weight_kg,purchases_weight_kg,sales_weight_kg,transfers_in_kg,transfers_out_kg,livestock_revenue_ars,stock_variation_ars,livestock_direct_cost_ars,agriculture_revenue_ars,agriculture_direct_cost_ars,cash_balance_ars,target_kg_ha,target_margin_ha_ars,updated_by)
select v.id,v.farm_id,v.campaign_id,v.ha,v.opening,v.closing,v.purchases,v.sales,0,v.transfers,v.livestock_revenue,v.stock_variation,v.livestock_cost,v.agri_revenue,v.agri_cost,v.cash,v.target_kg,v.target_margin,p.id from(values
('c5100000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000001'::uuid,'31000000-0000-4000-8000-000000000001'::uuid,1145::numeric,178600::numeric,235900::numeric,18600::numeric,58240::numeric,22200::numeric,116800000::numeric,18400000::numeric,61700000::numeric,162600000::numeric,107900000::numeric,32600000::numeric,90::numeric,44000::numeric),
('c5200000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','31000000-0000-4000-8000-000000000002',500,38700,62250,31600,47650,0,101300000,9700000,59400000,0,0,14200000,82,35000),
('c5300000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003','31000000-0000-4000-8000-000000000003',1385,231400,302600,28400,91800,34100,184200000,26300000,103500000,287400000,189600000,58700000,95,57000),
('c5400000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000004','31000000-0000-4000-8000-000000000004',640,91700,128400,12500,47200,8900,92700000,12600000,55300000,0,0,16800000,84,37000)
)v(id,farm_id,campaign_id,ha,opening,closing,purchases,sales,transfers,livestock_revenue,stock_variation,livestock_cost,agri_revenue,agri_cost,cash,target_kg,target_margin)
cross join lateral(select id from public.profiles where role='super_admin'and active order by created_at limit 1)p
on conflict(farm_id,campaign_id)do update set productive_hectares=excluded.productive_hectares,opening_weight_kg=excluded.opening_weight_kg,closing_weight_kg=excluded.closing_weight_kg,purchases_weight_kg=excluded.purchases_weight_kg,sales_weight_kg=excluded.sales_weight_kg,transfers_out_kg=excluded.transfers_out_kg,livestock_revenue_ars=excluded.livestock_revenue_ars,stock_variation_ars=excluded.stock_variation_ars,livestock_direct_cost_ars=excluded.livestock_direct_cost_ars,agriculture_revenue_ars=excluded.agriculture_revenue_ars,agriculture_direct_cost_ars=excluded.agriculture_direct_cost_ars,cash_balance_ars=excluded.cash_balance_ars,target_kg_ha=excluded.target_kg_ha,target_margin_ha_ars=excluded.target_margin_ha_ars,updated_at=now();

insert into public.agricultural_cycles(id,farm_id,campaign_id,lot_id,crop,variety,sown_hectares,harvested_hectares,sowing_date,harvest_date,target_yield_kg_ha,produced_tons,sold_tons,livestock_feed_tons,other_use_tons,reference_price_ars_ton,status,notes,created_by)
select v.id,v.farm_id,v.campaign_id,v.lot_id,v.crop,v.variety,v.ha,v.ha,v.sowing,v.harvest,v.target,v.produced,v.sold,v.feed,v.other_use,v.price,'cerrado'::public.crop_cycle_status,v.notes,p.id from(values
('f5100000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000001'::uuid,'31000000-0000-4000-8000-000000000001'::uuid,'40000000-0000-4000-8000-000000000003'::uuid,'Trigo pan','Baguette 620',280::numeric,'2025-06-20'::date,'2025-12-16'::date,4700::numeric,1288::numeric,920::numeric,0::numeric,0::numeric,285000::numeric,'Rinde 4.600 kg/ha; venta escalonada y saldo entregado'),
('f5100000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000004','Maíz','Híbrido templado',305,'2025-10-18','2026-04-22',8200,2348.5,168,780,0,281000,'Parte conservada como grano propio para suplementación'),
('f5300000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','31000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000012','Soja de primera','Grupo IV corto',425,'2025-11-05','2026-04-28',3400,1402.5,1080,0,0,505000,'Buen resultado con 3.300 kg/ha'),
('f5300000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003','31000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000013','Maíz','Híbrido VT3P',390,'2025-10-12','2026-04-12',8500,3198,2240,410,0,281000,'Rinde 8.200 kg/ha; 410 tn transferidas a ganadería'),
('f5300000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003','31000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000014','Trigo pan','Baguette 620',275,'2025-06-24','2025-12-18',4600,1237.5,980,0,0,307800,'Calidad comercial estándar')
)v(id,farm_id,campaign_id,lot_id,crop,variety,ha,sowing,harvest,target,produced,sold,feed,other_use,price,notes)
cross join lateral(select id from public.profiles where role='super_admin'and active order by created_at limit 1)p
on conflict(campaign_id,lot_id,crop)do update set produced_tons=excluded.produced_tons,sold_tons=excluded.sold_tons,livestock_feed_tons=excluded.livestock_feed_tons,status='cerrado',notes=excluded.notes;

insert into public.livestock_cycles(id,farm_id,campaign_id,herd_id,lot_id,stage,starts_on,ends_on,assigned_hectares,opening_heads,opening_weight_kg,opening_price_ars_kg,purchased_heads,purchased_weight_kg,purchase_cost_ars,sold_heads,sold_weight_kg,deaths_heads,closing_heads,closing_weight_kg,closing_price_ars_kg,target_adg_kg,target_kg_ha,status,notes,created_by)
select v.id,v.farm_id,v.campaign_id,v.herd_id,v.lot_id,v.stage::public.livestock_cycle_stage,'2025-06-01'::date,'2026-05-31'::date,v.ha,v.opening_heads,v.opening_weight,v.opening_price,v.purchased_heads,v.purchased_weight,v.purchase_cost,v.sold_heads,v.sold_weight,v.deaths,v.closing_heads,v.closing_weight,v.closing_price,v.target_adg,v.target_kg,'cerrado'::public.livestock_cycle_status,v.notes,p.id from(values
('ac510000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000001'::uuid,'31000000-0000-4000-8000-000000000001'::uuid,'50000000-0000-4000-8000-000000000001'::uuid,'40000000-0000-4000-8000-000000000001'::uuid,'cria',328.7::numeric,138,57960::numeric,2150::numeric,0,0::numeric,0::numeric,54,22680::numeric,3,81,37400::numeric,3150::numeric,.45::numeric,90::numeric,'Destete 86%; descarte de vacas y reposición propia'),
('ac520000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','31000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000006','recria',205,92,18400,2450,118,22800,55860000,96,34400,2,112,33050,3520,.61,82,'Recría pastoril; salida de 96 novillitos'),
('ac530000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','31000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000006','40000000-0000-4000-8000-000000000011','terminacion',265,126,41580,2300,74,23800,58600000,128,56800,1,71,30300,3650,.82,95,'Terminación con maíz propio; 444 kg promedio de venta'),
('ac540000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000004','31000000-0000-4000-8000-000000000004','50000000-0000-4000-8000-000000000007','40000000-0000-4000-8000-000000000017','cria',346,91,38220,2150,0,0,0,31,13020,2,58,26600,3150,.41,84,'Rodeo Angus; destete y venta de vacas vacías')
)v(id,farm_id,campaign_id,herd_id,lot_id,stage,ha,opening_heads,opening_weight,opening_price,purchased_heads,purchased_weight,purchase_cost,sold_heads,sold_weight,deaths,closing_heads,closing_weight,closing_price,target_adg,target_kg,notes)
cross join lateral(select id from public.profiles where role='super_admin'and active order by created_at limit 1)p
on conflict(campaign_id,herd_id)do update set closing_heads=excluded.closing_heads,closing_weight_kg=excluded.closing_weight_kg,status='cerrado',notes=excluded.notes;

insert into public.management_budgets(id,farm_id,campaign_id,activity,budget_revenue_ars,budget_cost_ars,forecast_revenue_ars,forecast_cost_ars,assumption_note,updated_by)
select gen_random_uuid(),v.farm_id,v.campaign_id,v.activity::public.production_activity,v.revenue,v.cost,v.revenue,v.cost,'Campaña cerrada: valores realizados consolidados',p.id from(values
('20000000-0000-4000-8000-000000000001'::uuid,'31000000-0000-4000-8000-000000000001'::uuid,'ganaderia',134400000::numeric,61700000::numeric),('20000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-000000000001','agricultura',162600000,107900000),
('20000000-0000-4000-8000-000000000002','31000000-0000-4000-8000-000000000002','ganaderia',111000000,59400000),('20000000-0000-4000-8000-000000000003','31000000-0000-4000-8000-000000000003','ganaderia',210500000,103500000),
('20000000-0000-4000-8000-000000000003','31000000-0000-4000-8000-000000000003','agricultura',287400000,189600000),('20000000-0000-4000-8000-000000000004','31000000-0000-4000-8000-000000000004','ganaderia',105300000,55300000)
)v(farm_id,campaign_id,activity,revenue,cost)cross join lateral(select id from public.profiles where role='super_admin'and active order by created_at limit 1)p
on conflict(farm_id,campaign_id,activity)do update set forecast_revenue_ars=excluded.forecast_revenue_ars,forecast_cost_ars=excluded.forecast_cost_ars,assumption_note=excluded.assumption_note;

insert into public.monthly_closures(id,farm_id,period_start,livestock_reconciled,inventory_reconciled,crops_updated,work_orders_updated,expenses_allocated,sales_updated,cash_reconciled,projections_reviewed,status,notes,updated_by)
select v.id,v.farm_id,'2026-05-01',true,true,true,true,true,true,true,true,'cerrado','Cierre final validado de campaña 2025/26',p.id from(values
('ce510000-0000-4000-8000-000000000001'::uuid,'20000000-0000-4000-8000-000000000001'::uuid),
('ce520000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002'),
('ce530000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003'),
('ce540000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000004')
)v(id,farm_id)cross join lateral(select id from public.profiles where role='super_admin'and active order by created_at limit 1)p
on conflict(farm_id,period_start)do update set livestock_reconciled=true,inventory_reconciled=true,crops_updated=true,work_orders_updated=true,expenses_allocated=true,sales_updated=true,cash_reconciled=true,projections_reviewed=true,status='cerrado',notes=excluded.notes,updated_at=now();

-- ===== FUENTE: supabase/migrations/035_demo_livestock_destination_decisions.sql =====

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

commit;

select 'Campos' as concepto,count(*)::text as cantidad from public.farms where active
union all select 'Campanias',count(*)::text from public.campaigns
union all select 'Tropas',count(*)::text from public.herds where active
union all select 'Cultivos actuales',count(*)::text from public.crop_stands
union all select 'Ordenes',count(*)::text from public.field_operations
union all select 'Gastos',count(*)::text from public.expenses
union all select 'Ventas',count(*)::text from public.income_sales
union all select 'Items de stock',count(*)::text from public.inventory_items;