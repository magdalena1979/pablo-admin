begin;

create or replace function public.correct_gallagher_session_type(
  p_farm_id uuid,
  p_session_id uuid,
  p_expected_type text,
  p_session_type text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.livestock_work_sessions%rowtype;
begin
  if not public.is_super_admin() or not public.can_manage_farm(p_farm_id) then
    raise exception 'No tenés permiso para corregir esta jornada.' using errcode = '42501';
  end if;
  if p_session_type is null or p_session_type not in ('otro', 'tacto', 'raspaje_toros') then
    raise exception 'Tipo de jornada inválido.';
  end if;

  select * into v_session
  from public.livestock_work_sessions
  where id = p_session_id and farm_id = p_farm_id and source = 'gallagher'
  for update;

  if not found or v_session.status <> 'confirmada' then
    raise exception 'La jornada de Gallagher no está disponible para corregir.';
  end if;
  if lower(v_session.session_type) = p_session_type then
    return;
  end if;
  if v_session.session_type is distinct from p_expected_type then
    raise exception 'El tipo cambió desde que abriste la jornada. Actualizá la vista y volvé a intentar.';
  end if;

  update public.livestock_work_sessions
  set session_type = p_session_type, updated_at = now()
  where id = v_session.id;

  insert into public.audit_logs(actor_id, farm_id, entity_type, entity_id, action, old_data, new_data)
  values (auth.uid(), v_session.farm_id, 'livestock_work_session', v_session.id::text,
    'Corregir tipo de jornada Gallagher',
    jsonb_build_object('session_type', v_session.session_type),
    jsonb_build_object('session_type', p_session_type));
end;
$$;

revoke all on function public.correct_gallagher_session_type(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.correct_gallagher_session_type(uuid, uuid, text, text) to authenticated;

create or replace function public.confirm_gallagher_csv_with_session_type(
  p_filename text,
  p_file_hash text,
  p_headers jsonb,
  p_rows jsonb,
  p_session_type text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
  v_session jsonb;
  v_expected_type text;
begin
  if p_session_type is null or p_session_type not in ('otro', 'tacto', 'raspaje_toros') then
    raise exception 'Tipo de jornada inválido.';
  end if;

  v_result := public.confirm_gallagher_csv_links(p_filename, p_file_hash, p_headers, p_rows);

  if p_session_type <> 'otro' and not coalesce((v_result->>'already_imported')::boolean, false) then
    for v_session in select value from jsonb_array_elements(v_result->'sessions')
    loop
      select session_type into v_expected_type from public.livestock_work_sessions
      where id = (v_session->>'session_id')::uuid;
      if lower(v_expected_type) is distinct from 'otro' then
        raise exception 'No se pudo verificar el tipo inicial de la jornada de Gallagher.';
      end if;
      perform public.correct_gallagher_session_type(
        (v_session->>'farm_id')::uuid,
        (v_session->>'session_id')::uuid,
        v_expected_type,
        p_session_type
      );
    end loop;
  end if;

  return v_result;
end;
$$;

revoke all on function public.confirm_gallagher_csv_with_session_type(text, text, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.confirm_gallagher_csv_with_session_type(text, text, jsonb, jsonb, text) to authenticated;

commit;
