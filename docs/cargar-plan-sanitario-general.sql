-- Carga inicial del plan sanitario general.
-- Ejecutar el archivo completo en Supabase SQL Editor después de las migraciones 064 y 065.
-- Crea trabajos de catálogo. Desde la migración 068, se aplican automáticamente
-- a los establecimientos activos con actividad ganadera configurada.

do $$
declare
  v_author uuid;
  v_inserted integer;
begin
  select id into v_author from public.profiles
  where role = 'super_admin' and active
  order by (id = auth.uid()) desc nulls last, created_at, id
  limit 1;
  if v_author is null then
    raise exception 'No hay un perfil activo de superadministración para registrar la carga.';
  end if;

  lock table public.farm_health_plan_items in share row exclusive mode;

  with catalogo(animal_group, name, action_type) as (
    values
      ('Vacas', 'Boqueo', 'control_clinico'),
      ('Vacas', 'Cobre', 'otro'),
      ('Vacas', 'Ivermectina', 'desparasitacion'),
      ('Vacas', 'Doramectina', 'desparasitacion'),
      ('Vacas', 'Sangrado', 'sangrado'),
      ('Vacas', 'Séxtuple clostridial', 'vacunacion'),
      ('Vacas', 'Vacuna contra diarrea neonatal', 'vacunacion'),
      ('Vacas', 'Vacuna reproductiva (IBR/DVB)', 'vacunacion'),
      ('Vacas', 'Vacuna reproductiva (IBR/DVB y leptospira)', 'vacunacion'),
      ('Vacas', 'Aftosa', 'vacunacion'),
      ('Vacas', 'Fasciolicida', 'desparasitacion'),
      ('Vacas', 'Carbunclo', 'vacunacion'),
      ('Terneros al pie', 'Neumonía', 'otro'),
      ('Terneros al pie', 'Vacuna contra mancha y gangrena', 'vacunacion'),
      ('Terneros al pie', 'Control de diarrea neonatal', 'control_clinico'),
      ('Terneros al pie', 'Aftosa', 'vacunacion'),
      ('Invernada', 'Vacuna contra mancha y gangrena (MGE)', 'vacunacion'),
      ('Invernada', 'Vacuna respiratoria (IBR/DVB y neumonía)', 'vacunacion'),
      ('Invernada', 'Cobre', 'otro'),
      ('Invernada', 'Doramectina', 'desparasitacion'),
      ('Invernada', 'Carbunclo', 'vacunacion'),
      ('Invernada', 'Ivermectina', 'desparasitacion'),
      ('Invernada', 'Aftosa', 'vacunacion'),
      ('Invernada', 'Control integrado de parásitos (HPG y tratamientos)', 'desparasitacion'),
      ('Invernada', 'Fofamizole', 'otro'),
      ('Invernada', 'Séxtuple', 'vacunacion'),
      ('Invernada', 'Brucelosis', 'otro'),
      ('Invernada', 'Fasciolicida', 'desparasitacion'),
      ('Toros', 'Séxtuple clostridial', 'vacunacion'),
      ('Toros', 'Fasciolicida', 'desparasitacion'),
      ('Toros', 'Aftosa', 'vacunacion'),
      ('Toros', 'Cobre', 'otro'),
      ('Toros', 'Carbunclo', 'vacunacion'),
      ('Toros', 'Vacuna reproductiva', 'vacunacion'),
      ('Toros', 'Control de ectoparásitos', 'otro'),
      ('Toros', 'Primer raspaje', 'raspaje_toros'),
      ('Toros', 'Segundo raspaje', 'raspaje_toros'),
      ('Toros', 'Revisación clínica', 'control_clinico'),
      ('Vaquillonas de primer servicio de otoño', 'Séxtuple clostridial', 'vacunacion'),
      ('Vaquillonas de primer servicio de otoño', 'Fasciolicida', 'desparasitacion'),
      ('Vaquillonas de primer servicio de otoño', 'Vacuna reproductiva (IBR/DVB)', 'vacunacion'),
      ('Vaquillonas de primer servicio de otoño', 'Cobre', 'otro'),
      ('Vaquillonas de primer servicio de otoño', 'Carbunclo', 'vacunacion'),
      ('Vaquillonas de primer servicio de otoño', 'Ivermectina F', 'desparasitacion'),
      ('Vaquillonas de primer servicio de otoño', 'Aftosa', 'vacunacion'),
      ('Vaquillonas de primer servicio de otoño', 'Doramectina', 'desparasitacion'),
      ('Vacas paridas de otoño', 'Fasciolicida', 'desparasitacion'),
      ('Vacas paridas de otoño', 'Carbunclo', 'vacunacion'),
      ('Vacas paridas de otoño', 'Cobre', 'otro'),
      ('Vacas paridas de otoño', 'Séxtuple clostridial', 'vacunacion'),
      ('Vacas paridas de otoño', 'Aftosa', 'vacunacion'),
      ('Vacas paridas de otoño', 'Vacuna contra diarrea neonatal', 'vacunacion'),
      ('Vacas paridas de otoño', 'Vacuna reproductiva (IBR/DVB)', 'vacunacion'),
      ('Terneros de otoño al pie', 'Neumonía', 'otro'),
      ('Terneros de otoño al pie', 'Vacuna contra mancha y gangrena', 'vacunacion'),
      ('Terneros de otoño al pie', 'Ivermectina', 'desparasitacion'),
      ('Terneros de otoño al pie', 'Olivit SE', 'otro'),
      ('Terneros de otoño al pie', 'Ricobendazole', 'desparasitacion'),
      ('Terneros de otoño al pie', 'Aftosa', 'vacunacion'),
      ('Terneros de otoño al pie', 'Brucelosis en hembras', 'otro')
  )
  insert into public.farm_health_plan_items(id, animal_group, name, action_type, created_by)
  select md5('plan-sanitario-general-v1|' || w.animal_group || '|' || w.name)::uuid,
    w.animal_group, w.name, w.action_type, v_author
  from catalogo w
  where not exists (
    select 1 from public.farm_health_plan_items p
    where lower(trim(p.name)) = lower(w.name)
      and lower(trim(p.animal_group)) = lower(w.animal_group)
  )
  on conflict (id) do nothing;

  get diagnostics v_inserted = row_count;
  raise notice 'Trabajos agregados al plan sanitario general: %', v_inserted;
end;
$$;
