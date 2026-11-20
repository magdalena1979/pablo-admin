create or replace function public.invoice_professional_work_selection(
  p_client_id uuid, p_work_ids uuid[], p_session_ids uuid[]
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  item record;
  changed bigint;
begin
  if not coalesce(public.is_super_admin(), false) or p_client_id is null
    or coalesce(cardinality(p_work_ids), 0) + coalesce(cardinality(p_session_ids), 0) = 0 then
    raise exception 'Seleccioná trabajos de un mismo cliente.';
  end if;

  update public.professional_works w set invoiced = true
  from public.farms f
  where w.id = any(p_work_ids) and f.id = w.farm_id and f.client_id = p_client_id;
  get diagnostics changed = row_count;
  if changed <> coalesce(cardinality(p_work_ids), 0) then
    raise exception 'Todos los trabajos deben pertenecer al mismo cliente.';
  end if;

  for item in
    select selection.id, s.farm_id, (s.session_date at time zone 'UTC')::date as work_date, s.title, f.client_id, link.work_id
    from unnest(p_session_ids) as selection(id)
    left join public.livestock_work_sessions s on s.id = selection.id
      and s.source = 'gallagher' and s.status = 'confirmada'
    left join public.farms f on f.id = s.farm_id
    left join public.professional_work_sessions link on link.session_id = s.id
    order by selection.id
  loop
    if item.client_id is distinct from p_client_id then
      raise exception 'Todas las sesiones deben estar confirmadas y pertenecer al mismo cliente.';
    end if;
    if item.work_id is null then
      perform public.create_professional_work(item.id, item.farm_id, item.work_date,
        coalesce(nullif(left(trim(item.title), 200), ''), 'Sesión Gallagher'), array[item.id]);
    elsif item.work_id <> item.id then
      raise exception 'Una sesión ya está vinculada a otro trabajo. Actualizá la lista y volvé a seleccionarla.';
    end if;
    update public.professional_works set invoiced = true where id = item.id;
    if not found then
      raise exception 'No se pudo actualizar una de las sesiones.';
    end if;
  end loop;
end;
$$;
