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
