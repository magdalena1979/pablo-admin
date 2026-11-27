begin;

create function public.assign_general_health_plan(p_item_ids uuid[], p_farm_ids uuid[])
returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  if not public.is_super_admin() then
    raise exception 'No tenés permiso para asignar el plan sanitario.' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_item_ids), 0) = 0 or coalesce(cardinality(p_farm_ids), 0) = 0 then
    raise exception 'Seleccioná los trabajos y al menos un campo.';
  end if;
  if exists (
    select 1 from unnest(p_farm_ids) as requested(id)
    where not exists (
      select 1 from public.farms f
      where f.id = requested.id and f.active and public.can_manage_farm(f.id)
    )
  ) then
    raise exception 'Revisá los campos seleccionados.';
  end if;

  perform id from public.farm_health_plan_items
  where id = any(p_item_ids)
  order by id for update;

  if exists (
    select 1 from unnest(p_item_ids) as requested(id)
    where not exists (
      select 1 from public.farm_health_plan_items p where p.id = requested.id and p.archived_at is null
    )
  ) then
    raise exception 'El plan cambió. Volvé a cargarlo antes de asignar los trabajos.';
  end if;

  insert into public.health_plan_item_farms as assignment (item_id, farm_id)
  select distinct requested_item.id, requested_farm.id
  from unnest(p_item_ids) as requested_item(id)
  cross join unnest(p_farm_ids) as requested_farm(id)
  on conflict (item_id, farm_id) do update set active = true where not assignment.active;
end;
$$;

revoke all on function public.assign_general_health_plan(uuid[], uuid[]) from public, anon, authenticated;
grant execute on function public.assign_general_health_plan(uuid[], uuid[]) to authenticated;

commit;
