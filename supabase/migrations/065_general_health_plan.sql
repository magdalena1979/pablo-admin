begin;

create table public.health_plan_item_farms (
  item_id uuid not null references public.farm_health_plan_items(id) on delete restrict,
  farm_id uuid not null references public.farms(id) on delete restrict,
  active boolean not null default true,
  primary key (item_id, farm_id)
);

insert into public.health_plan_item_farms (item_id, farm_id)
select id, farm_id from public.farm_health_plan_items;

create index health_plan_item_farms_by_farm_idx on public.health_plan_item_farms (farm_id, item_id);
alter table public.health_plan_item_farms enable row level security;
revoke all on public.health_plan_item_farms from public, anon, authenticated;
grant select, insert, update on public.health_plan_item_farms to authenticated;
create policy health_plan_assignments_read on public.health_plan_item_farms for select to authenticated
  using (public.is_super_admin() or public.can_access_farm(farm_id));
create policy health_plan_assignments_create on public.health_plan_item_farms for insert to authenticated
  with check (public.is_super_admin() and public.can_manage_farm(farm_id));
create policy health_plan_assignments_update on public.health_plan_item_farms for update to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin() and public.can_manage_farm(farm_id));

drop policy farm_health_plan_read on public.farm_health_plan_items;
drop policy farm_health_plan_create on public.farm_health_plan_items;
drop policy work_actions_health_plan_farm on public.livestock_work_session_actions;

alter table public.farm_health_plan_items drop column farm_id,
  add column archived_at timestamptz;
grant update on public.farm_health_plan_items to authenticated;
create policy farm_health_plan_read on public.farm_health_plan_items for select to authenticated
  using (public.is_super_admin() or exists (
    select 1 from public.health_plan_item_farms a
    where a.item_id = farm_health_plan_items.id and public.can_access_farm(a.farm_id)
  ));
create policy farm_health_plan_create on public.farm_health_plan_items for insert to authenticated
  with check (public.is_super_admin() and created_by = auth.uid());
create policy farm_health_plan_update on public.farm_health_plan_items for update to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy work_actions_health_plan_farm on public.livestock_work_session_actions
  as restrictive for all to authenticated using (true)
  with check (health_plan_item_id is null or exists (
    select 1 from public.health_plan_item_farms a
    join public.livestock_work_sessions s on s.farm_id = a.farm_id
    where a.item_id = health_plan_item_id and s.id = session_id
  ));

create function public.save_general_health_plan_item(
  p_id uuid, p_name text, p_animal_group text, p_type text, p_farm_ids uuid[]
)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_super_admin() then
    raise exception 'No tenés permiso para editar el plan sanitario.' using errcode = '42501';
  end if;
  if p_farm_ids is null or exists (
    select 1 from unnest(p_farm_ids) as requested(id)
    where not exists (
      select 1 from public.farms f where f.id = requested.id and public.can_manage_farm(f.id)
    )
  ) then
    raise exception 'Revisá los campos seleccionados.';
  end if;

  if p_id is null then
    insert into public.farm_health_plan_items(name, animal_group, action_type)
    values (trim(p_name), trim(p_animal_group), p_type) returning id into v_id;
  else
    update public.farm_health_plan_items
    set name = trim(p_name), animal_group = trim(p_animal_group), action_type = p_type
    where id = p_id and archived_at is null returning id into v_id;
    if not found then raise exception 'El trabajo ya no está disponible para editar.'; end if;
  end if;

  update public.health_plan_item_farms set active = false
    where item_id = v_id and active and not (farm_id = any(p_farm_ids));
  insert into public.health_plan_item_farms(item_id, farm_id)
    select distinct v_id, id from unnest(p_farm_ids) as requested(id)
    on conflict (item_id, farm_id) do update set active = true;
  return v_id;
end;
$$;
revoke all on function public.save_general_health_plan_item(uuid, text, text, text, uuid[]) from public, anon, authenticated;
grant execute on function public.save_general_health_plan_item(uuid, text, text, text, uuid[]) to authenticated;

create or replace function public.confirm_gallagher_csv_with_health_plan(
  p_filename text, p_file_hash text, p_headers jsonb, p_rows jsonb,
  p_session_type text, p_health_links jsonb
)
returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  v_result jsonb;
  v_session jsonb;
  v_farm uuid;
  v_session_id uuid;
  v_import_id uuid;
  v_action_id uuid;
  v_choice jsonb;
  v_item public.farm_health_plan_items%rowtype;
begin
  if p_session_type is null or p_session_type not in ('sanidad', 'tacto_sanidad')
    or p_health_links is null or jsonb_typeof(p_health_links) <> 'object' then
    raise exception 'Revisá el tipo de jornada y sus vínculos con el plan sanitario.';
  end if;

  v_result := public.confirm_gallagher_csv_with_session_type(p_filename, p_file_hash, p_headers, p_rows,
    case when p_session_type = 'tacto_sanidad' then 'tacto' else 'otro' end);
  if coalesce((v_result->>'already_imported')::boolean, false) then return v_result; end if;

  for v_session in select value from jsonb_array_elements(v_result->'sessions')
  loop
    v_farm := (v_session->>'farm_id')::uuid;
    v_session_id := (v_session->>'session_id')::uuid;
    v_import_id := (v_session->>'import_id')::uuid;
    v_choice := p_health_links->(v_farm::text);
    select * into v_item from public.farm_health_plan_items
      where id = (v_choice->>'itemId')::uuid and archived_at is null for share;
    if not found or not public.can_manage_farm(v_farm) or not exists (
      select 1 from public.health_plan_item_farms a
      where a.item_id = v_item.id and a.farm_id = v_farm and a.active
    ) then
      raise exception 'Elegí un trabajo activo del plan sanitario asignado a cada establecimiento del archivo.';
    end if;

    if p_session_type = 'sanidad' then
      update public.livestock_work_sessions set session_type = 'sanidad', updated_at = now(),
        type_id = (select id from public.livestock_session_type_catalog where code = 'sanidad' and active)
      where id = v_session_id and farm_id = v_farm and created_by = auth.uid()
        and lower(session_type) = 'otro';
      if not found then raise exception 'No se pudo clasificar la jornada sanitaria.'; end if;
    end if;

    insert into public.livestock_work_session_actions(
      session_id, action_type, action_type_id, source, created_from_import_id, health_plan_item_id, metadata
    ) values (
      v_session_id, v_item.action_type,
      (select id from public.livestock_action_type_catalog where code = v_item.action_type and active),
      'gallagher', v_import_id, v_item.id,
      jsonb_build_object('plan_item_name', v_item.name, 'plan_animal_group', v_item.animal_group, 'scope_confirmed_for_all',
        coalesce((v_choice->>'allAnimals')::boolean, false))
    ) returning id into v_action_id;

    insert into public.livestock_work_session_action_imports(action_id, import_id)
      values (v_action_id, v_import_id);

    insert into public.livestock_work_session_action_animals(action_id, animal_id, created_from_import_id)
    select distinct v_action_id, r.animal_id, v_import_id
    from public.livestock_import_rows r
    where r.import_id = v_import_id and r.animal_id is not null and r.result in ('NUEVO', 'EXISTENTE')
      and (coalesce((v_choice->>'allAnimals')::boolean, false)
        or (v_item.action_type = 'sangrado' and exists (
          select 1 from jsonb_each_text(case when jsonb_typeof(r.raw_data->'rawCsv') = 'object'
            then r.raw_data->'rawCsv' else '{}'::jsonb end) f
          where lower(trim(f.key)) in ('sangrado.bruceiosis', 'sangrado.bruceliosis')
            and lower(trim(f.value)) = 'yes'
        )));

    insert into public.livestock_work_session_action_animal_imports(action_id, animal_id, import_id)
    select v_action_id, a.animal_id, v_import_id from public.livestock_work_session_action_animals a
    where a.action_id = v_action_id;
  end loop;
  return v_result;
end;
$$;

revoke all on function public.confirm_gallagher_csv_with_health_plan(text, text, jsonb, jsonb, text, jsonb) from public, anon, authenticated;
grant execute on function public.confirm_gallagher_csv_with_health_plan(text, text, jsonb, jsonb, text, jsonb) to authenticated;

commit;
