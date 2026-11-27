begin;

create function public.sync_livestock_health_plan_assignments()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('livestock_health_plan_assignments', 0));

  if tg_table_name = 'farms' then
    if new.active and cardinality(new.livestock_activities) > 0 then
      insert into public.health_plan_item_farms(item_id, farm_id)
      select p.id, new.id from public.farm_health_plan_items p where p.archived_at is null
      on conflict (item_id, farm_id) do update set active = true
        where not health_plan_item_farms.active;
    else
      update public.health_plan_item_farms set active = false where farm_id = new.id and active;
    end if;
  elsif new.archived_at is null then
    insert into public.health_plan_item_farms(item_id, farm_id)
    select new.id, f.id from public.farms f where f.active and cardinality(f.livestock_activities) > 0
    on conflict (item_id, farm_id) do update set active = true
      where not health_plan_item_farms.active;
  else
    update public.health_plan_item_farms set active = false where item_id = new.id and active;
  end if;

  return new;
end;
$$;

revoke all on function public.sync_livestock_health_plan_assignments() from public, anon, authenticated;

create trigger farms_sync_health_plan
after insert or update of active, livestock_activities on public.farms
for each row execute function public.sync_livestock_health_plan_assignments();

create trigger health_plan_items_sync_farms
after insert or update of archived_at on public.farm_health_plan_items
for each row execute function public.sync_livestock_health_plan_assignments();

update public.health_plan_item_farms a set active = false
from public.farms f, public.farm_health_plan_items p
where a.farm_id = f.id and a.item_id = p.id and a.active
  and (not f.active or cardinality(f.livestock_activities) = 0 or p.archived_at is not null);

insert into public.health_plan_item_farms(item_id, farm_id)
select p.id, f.id
from public.farm_health_plan_items p cross join public.farms f
where p.archived_at is null and f.active and cardinality(f.livestock_activities) > 0
on conflict (item_id, farm_id) do update set active = true
  where not health_plan_item_farms.active;

revoke insert, update on public.health_plan_item_farms from authenticated;
revoke execute on function public.assign_general_health_plan(uuid[], uuid[]) from authenticated;
revoke execute on function public.save_general_health_plan_item(uuid, text, text, text, uuid[]) from authenticated;
revoke execute on function public.save_general_health_plan_item(uuid, text, text, text, uuid[], smallint[]) from authenticated;

create function public.save_general_health_plan_item(
  p_id uuid, p_name text, p_animal_group text, p_type text, p_months smallint[]
)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_id uuid;
  v_months smallint[];
begin
  if not public.is_super_admin() then
    raise exception 'No tenés permiso para editar el plan sanitario.' using errcode = '42501';
  end if;
  if p_months is null or not (p_months <@ array[1,2,3,4,5,6,7,8,9,10,11,12]::smallint[]) then
    raise exception 'Revisá los meses seleccionados.';
  end if;
  v_months := array(select distinct month_number from unnest(p_months) as selected(month_number) order by month_number);

  if p_id is null then
    insert into public.farm_health_plan_items(name, animal_group, action_type, planned_months)
    values (trim(p_name), trim(p_animal_group), p_type, v_months) returning id into v_id;
  else
    update public.farm_health_plan_items
    set name = trim(p_name), animal_group = trim(p_animal_group), action_type = p_type, planned_months = v_months
    where id = p_id and archived_at is null returning id into v_id;
    if not found then raise exception 'El trabajo ya no está disponible para editar.'; end if;
  end if;
  return v_id;
end;
$$;

revoke all on function public.save_general_health_plan_item(uuid, text, text, text, smallint[]) from public, anon, authenticated;
grant execute on function public.save_general_health_plan_item(uuid, text, text, text, smallint[]) to authenticated;

commit;
