-- Compatibilidad entre los importadores históricos y la anulación auditada de eventos.
--
-- 040 reemplazó la restricción única general de animal_events por un índice único
-- parcial sobre eventos activos (voided_at is null). Los importadores definidos en
-- 035, 037 y 038 deben incluir el mismo predicado para que PostgreSQL pueda inferir
-- correctamente el índice durante ON CONFLICT.
--
-- Se actualizan las funciones instaladas sin modificar las migraciones históricas.
do $migration$
declare
  v_function record;
  v_definition text;
  v_updated_definition text;
  v_old_clause constant text :=
    'on conflict(farm_id,source,source_key) do nothing';
  v_new_clause constant text :=
    'on conflict(farm_id,source,source_key) where voided_at is null do nothing';
  v_function_count integer := 0;
begin
  for v_function in
    select p.oid, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'import_livestock_provider_csv',
        'import_livestock_provider_csv_with_events',
        'import_livestock_provider_csv_with_filename_audit'
      )
  loop
    v_function_count := v_function_count + 1;
    v_definition := pg_get_functiondef(v_function.oid);

    if position(v_new_clause in lower(v_definition)) > 0 then
      -- La función ya fue corregida; permite volver a ejecutar la migración.
      continue;
    end if;

    if position(v_old_clause in lower(v_definition)) = 0 then
      raise exception
        'No se encontró la cláusula ON CONFLICT esperada en public.%',
        v_function.proname;
    end if;

    v_updated_definition := replace(
      v_definition,
      v_old_clause,
      v_new_clause
    );

    execute v_updated_definition;
  end loop;

  if v_function_count <> 3 then
    raise exception
      'Se esperaban 3 funciones de importación para corregir y se encontraron %',
      v_function_count;
  end if;
end
$migration$;

comment on index public.animal_events_active_source_uidx is
  'Evita duplicar eventos activos; un evento anulado conserva auditoría y permite una nueva importación.';
