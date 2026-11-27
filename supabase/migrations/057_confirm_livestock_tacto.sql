begin;

create or replace function public.confirm_livestock_tacto(p_farm_id uuid, p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.livestock_work_sessions%rowtype;
begin
  if not public.is_super_admin() or not public.can_manage_farm(p_farm_id) then
    raise exception 'No tenés permiso para clasificar esta jornada.' using errcode = '42501';
  end if;

  select * into v_session
  from public.livestock_work_sessions
  where id = p_session_id and farm_id = p_farm_id
  for update;

  if not found or v_session.status <> 'confirmada' then
    raise exception 'La jornada no está disponible para clasificar.';
  end if;
  if lower(v_session.session_type) = 'tacto' then
    return;
  end if;
  if lower(v_session.session_type) <> 'otro' then
    raise exception 'La jornada ya tiene otro tipo asignado.';
  end if;

  update public.livestock_work_sessions
  set session_type = 'tacto', updated_at = now()
  where id = v_session.id;

  insert into public.audit_logs(actor_id, farm_id, entity_type, entity_id, action, old_data, new_data)
  values (auth.uid(), v_session.farm_id, 'livestock_work_session', v_session.id::text,
    'Clasificar jornada como tacto',
    jsonb_build_object('session_type', v_session.session_type),
    jsonb_build_object('session_type', 'tacto'));
end;
$$;

revoke all on function public.confirm_livestock_tacto(uuid, uuid) from public, anon, authenticated;
grant execute on function public.confirm_livestock_tacto(uuid, uuid) to authenticated;

commit;
