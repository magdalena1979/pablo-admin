begin;

alter table public.farm_health_plan_items
  add column planned_months smallint[] not null default '{}',
  add constraint farm_health_plan_months_valid check (
    coalesce(array_ndims(planned_months), 1) = 1
    and planned_months <@ array[1,2,3,4,5,6,7,8,9,10,11,12]::smallint[]
    and cardinality(planned_months) <= 12
  );

create function public.save_general_health_plan_item(
  p_id uuid, p_name text, p_animal_group text, p_type text, p_farm_ids uuid[], p_months smallint[]
)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_months is null or not (p_months <@ array[1,2,3,4,5,6,7,8,9,10,11,12]::smallint[]) then
    raise exception 'Revisá los meses seleccionados.';
  end if;
  v_id := public.save_general_health_plan_item(p_id, p_name, p_animal_group, p_type, p_farm_ids);
  update public.farm_health_plan_items
    set planned_months = array(
      select distinct month_number from unnest(p_months) as selected(month_number) order by month_number
    )
    where id = v_id;
  return v_id;
end;
$$;

revoke all on function public.save_general_health_plan_item(uuid, text, text, text, uuid[], smallint[]) from public, anon, authenticated;
grant execute on function public.save_general_health_plan_item(uuid, text, text, text, uuid[], smallint[]) to authenticated;

commit;
