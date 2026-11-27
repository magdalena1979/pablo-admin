begin;

create table public.gallagher_atosa_identifications (
  import_id uuid not null references public.livestock_imports(id) on delete cascade,
  work_date date not null,
  description text not null check (char_length(trim(description)) between 1 and 200),
  confirmed_by uuid not null references public.profiles(id),
  confirmed_at timestamptz not null default now(),
  primary key (import_id, work_date)
);

alter table public.gallagher_atosa_identifications enable row level security;
revoke all on public.gallagher_atosa_identifications from public, anon, authenticated;
grant select on public.gallagher_atosa_identifications to authenticated;
create policy atosa_identifications_read on public.gallagher_atosa_identifications
  for select to authenticated using (
    exists (select 1 from public.livestock_imports i
      where i.id = import_id and public.can_access_farm(i.farm_id))
  );

create function public.confirm_gallagher_atosa_identification(
  p_import_id uuid, p_work_date date, p_description text
)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_farm_id uuid;
  v_previous text;
  v_description text := trim(p_description);
begin
  if p_work_date is null or v_description is null or char_length(v_description) not between 1 and 200 then
    raise exception 'Ingresá un nombre de hasta 200 caracteres.';
  end if;

  select i.farm_id into v_farm_id
  from public.livestock_imports i
  where i.id = p_import_id and i.provider = 'gallagher'
    and i.status not in ('anulada', 'revertida', 'revertido')
  for update;
  if not found or auth.uid() is null or not public.can_manage_farm(v_farm_id) then
    raise exception 'No tenés permiso para identificar este archivo.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.livestock_import_rows r
    where r.import_id = p_import_id and r.animal_id is not null and r.result in ('NUEVO', 'EXISTENTE')
      and coalesce(nullif(r.raw_data->>'sourceDate', ''), to_char(r.event_date at time zone 'UTC', 'YYYY-MM-DD')) = to_char(p_work_date, 'YYYY-MM-DD')
      and exists (
        select 1 from jsonb_each_text(
          case when jsonb_typeof(r.raw_data->'rawCsv') = 'object' then r.raw_data->'rawCsv' else '{}'::jsonb end
        ) f where lower(trim(f.key)) = 'atosa.clost.repro.co' and nullif(trim(f.value), '') is not null
      )
  ) then
    raise exception 'El archivo no tiene marcas ATOSA vinculadas para esa fecha.';
  end if;

  select description into v_previous from public.gallagher_atosa_identifications
  where import_id = p_import_id and work_date = p_work_date;
  if v_previous is not distinct from v_description then return; end if;

  insert into public.gallagher_atosa_identifications(import_id, work_date, description, confirmed_by)
  values (p_import_id, p_work_date, v_description, auth.uid())
  on conflict (import_id, work_date) do update set
    description = excluded.description, confirmed_by = excluded.confirmed_by, confirmed_at = now();

  insert into public.audit_logs(actor_id, farm_id, entity_type, entity_id, action, old_data, new_data)
  values (auth.uid(), v_farm_id, 'gallagher_atosa_identification', p_import_id::text, 'Identificar marca ATOSA',
    jsonb_build_object('fecha', p_work_date, 'descripcion', v_previous),
    jsonb_build_object('fecha', p_work_date, 'descripcion', v_description));
end;
$$;

revoke all on function public.confirm_gallagher_atosa_identification(uuid, date, text) from public, anon, authenticated;
grant execute on function public.confirm_gallagher_atosa_identification(uuid, date, text) to authenticated;

commit;
