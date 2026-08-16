create or replace function public.create_farm_with_lots(
  p_client_name text,
  p_contact_name text,
  p_farm_name text,
  p_service_mode public.service_mode,
  p_locality text,
  p_lots jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_id uuid;
  v_farm_id uuid;
  v_lot jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'No tenés permiso para crear establecimientos' using errcode = '42501';
  end if;
  if nullif(trim(p_client_name), '') is null or nullif(trim(p_farm_name), '') is null then
    raise exception 'Cliente y campo son obligatorios';
  end if;

  insert into public.clients (legal_name, contact_name)
  values (trim(p_client_name), nullif(trim(p_contact_name), ''))
  returning id into v_client_id;

  insert into public.farms (client_id, name, service_mode, locality)
  values (v_client_id, trim(p_farm_name), p_service_mode, nullif(trim(p_locality), ''))
  returning id into v_farm_id;

  insert into public.campaigns (farm_id, name, starts_on, ends_on)
  values (v_farm_id, '2026/27', '2026-06-01', '2027-05-31');

  for v_lot in select value from jsonb_array_elements(coalesce(p_lots, '[]'::jsonb)) loop
    if nullif(trim(v_lot->>'name'), '') is not null and coalesce((v_lot->>'hectares')::numeric, 0) > 0 then
      insert into public.lots (farm_id, name, hectares, current_use)
      values (v_farm_id, trim(v_lot->>'name'), (v_lot->>'hectares')::numeric, nullif(trim(v_lot->>'current_use'), ''));
    end if;
  end loop;

  insert into public.audit_logs (actor_id, farm_id, entity_type, entity_id, action, new_data)
  values (auth.uid(), v_farm_id, 'farm', v_farm_id::text, 'Creación de establecimiento', jsonb_build_object('client_id', v_client_id, 'name', p_farm_name));
  return v_farm_id;
end;
$$;

revoke all on function public.create_farm_with_lots(text,text,text,public.service_mode,text,jsonb) from public;
grant execute on function public.create_farm_with_lots(text,text,text,public.service_mode,text,jsonb) to authenticated;
