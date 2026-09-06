-- Ganadería individual, eventos extensibles e importaciones de proveedores.
alter table public.animals
  add column if not exists electronic_id text,
  add column if not exists electronic_id_raw text,
  add column if not exists breed text,
  add column if not exists status text not null default 'activo',
  add column if not exists updated_at timestamptz not null default now();

alter table public.health_events add column if not exists responsible text;

create unique index if not exists animals_farm_eid_uidx
  on public.animals(farm_id, electronic_id) where electronic_id is not null;

create table if not exists public.livestock_imports (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  provider text not null default 'gallagher',
  filename text not null,
  file_hash text not null,
  detected_at timestamptz,
  imported_at timestamptz not null default now(),
  imported_by uuid not null references public.profiles(id),
  total_rows integer not null default 0,
  created_animals integer not null default 0,
  existing_animals integer not null default 0,
  error_rows integer not null default 0,
  status text not null default 'procesando',
  unique(farm_id, provider, file_hash)
);

create table if not exists public.animal_events (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  event_type text not null,
  event_date timestamptz not null,
  source text not null default 'manual',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  import_id uuid references public.livestock_imports(id) on delete set null,
  source_key text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(farm_id, source, source_key)
);

create table if not exists public.livestock_import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.livestock_imports(id) on delete cascade,
  row_number integer not null,
  animal_id uuid references public.animals(id) on delete set null,
  tag_number text,
  electronic_id_raw text,
  electronic_id text,
  event_date timestamptz,
  draft_group text,
  notes text,
  result text not null,
  error_message text,
  raw_data jsonb not null default '{}'::jsonb,
  unique(import_id, row_number)
);

create table if not exists public.health_event_animals (
  health_event_id uuid not null references public.health_events(id) on delete cascade,
  animal_id uuid not null references public.animals(id) on delete cascade,
  primary key(health_event_id, animal_id)
);

create index if not exists animal_events_animal_date_idx on public.animal_events(animal_id,event_date desc);
create index if not exists livestock_imports_farm_date_idx on public.livestock_imports(farm_id,imported_at desc);

alter table public.livestock_imports enable row level security;
alter table public.animal_events enable row level security;
alter table public.livestock_import_rows enable row level security;
alter table public.health_event_animals enable row level security;

create policy livestock_imports_access on public.livestock_imports for all to authenticated
  using(public.can_access_farm(farm_id)) with check(public.can_manage_farm(farm_id) and imported_by=auth.uid());
create policy animal_events_access on public.animal_events for all to authenticated
  using(public.can_access_farm(farm_id)) with check(public.can_manage_farm(farm_id) and created_by=auth.uid());
create policy livestock_import_rows_access on public.livestock_import_rows for all to authenticated
  using(exists(select 1 from public.livestock_imports i where i.id=import_id and public.can_access_farm(i.farm_id)))
  with check(exists(select 1 from public.livestock_imports i where i.id=import_id and public.can_manage_farm(i.farm_id)));
create policy health_event_animals_access on public.health_event_animals for all to authenticated
  using(exists(select 1 from public.health_events h where h.id=health_event_id and public.can_access_farm(h.farm_id)))
  with check(exists(select 1 from public.health_events h where h.id=health_event_id and public.can_manage_farm(h.farm_id)));

create or replace function public.import_livestock_provider_csv(
  p_farm_id uuid, p_provider text, p_filename text, p_file_hash text, p_rows jsonb,
  p_category_name text default null, p_herd_name text default null,
  p_reproductive_status text default null, p_calving_season text default null,
  p_detected_code text default null
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_import uuid; v_row jsonb; v_animal uuid; v_category uuid; v_herd uuid; v_created int:=0; v_existing int:=0; v_errors int:=0; v_result text; v_tag text; v_eid text; v_raw text; v_date timestamptz; v_group text; v_first_date timestamptz;
begin
  if not public.can_manage_farm(p_farm_id) then raise exception 'Sin permisos para este establecimiento'; end if;
  if exists(select 1 from public.livestock_imports where farm_id=p_farm_id and provider=p_provider and file_hash=p_file_hash) then raise exception 'Este archivo ya fue importado'; end if;
  insert into public.livestock_imports(farm_id,provider,filename,file_hash,imported_by,total_rows,status)
  values(p_farm_id,p_provider,p_filename,p_file_hash,auth.uid(),jsonb_array_length(p_rows),'procesando') returning id into v_import;
  if nullif(trim(p_category_name),'') is not null then
    select id into v_category from public.livestock_categories where lower(name)=lower(trim(p_category_name)) limit 1;
    if v_category is null then insert into public.livestock_categories(name) values(trim(p_category_name)) returning id into v_category; end if;
  end if;
  if nullif(trim(p_herd_name),'') is not null then
    insert into public.herds(farm_id,category_id,name) values(p_farm_id,v_category,trim(p_herd_name))
    on conflict(farm_id,name) do update set category_id=coalesce(public.herds.category_id,excluded.category_id),active=true
    returning id into v_herd;
  end if;
  for v_row in select * from jsonb_array_elements(p_rows) loop
    v_tag:=nullif(trim(v_row->>'tagNumber'),''); v_raw:=nullif(trim(v_row->>'electronicIdRaw'),'');
    v_eid:=nullif(regexp_replace(coalesce(v_raw,''),'[^0-9A-Za-z]','','g'),''); v_group:=nullif(trim(v_row->>'draftGroup'),'');
    begin v_date:=(v_row->>'eventDate')::timestamptz; exception when others then v_date:=null; end;
    v_animal:=null; v_result:='ERROR';
    if v_eid is null or v_date is null then v_errors:=v_errors+1;
    else
      select id into v_animal from public.animals where farm_id=p_farm_id and electronic_id=v_eid;
      if v_animal is null then
        begin
          insert into public.animals(farm_id,herd_id,category_id,tag_number,electronic_id,electronic_id_raw,status)
          values(p_farm_id,v_herd,v_category,coalesce(v_tag,v_eid),v_eid,v_raw,'activo') returning id into v_animal;
          v_created:=v_created+1; v_result:='NUEVO';
        exception when unique_violation then v_errors:=v_errors+1; v_result:='CONFLICTO'; end;
      elsif exists(select 1 from public.animals where id=v_animal and tag_number<>coalesce(v_tag,tag_number)) then
        v_errors:=v_errors+1; v_result:='CONFLICTO';
      else v_existing:=v_existing+1; v_result:='EXISTENTE';
        update public.animals set herd_id=coalesce(herd_id,v_herd),category_id=coalesce(category_id,v_category),updated_at=now() where id=v_animal;
      end if;
      if v_animal is not null and v_result<>'CONFLICTO' then
        insert into public.animal_events(animal_id,farm_id,event_type,event_date,source,notes,metadata,import_id,source_key,created_by)
        values(v_animal,p_farm_id,'lectura',v_date,p_provider,v_row->>'notes',jsonb_build_object('draft_group',v_group,'filename',p_filename,'category_suggested',p_category_name,'herd_suggested',p_herd_name,'reproductive_status',p_reproductive_status,'calving_season',p_calving_season,'detected_code',p_detected_code),v_import,v_eid||'|'||v_date::text,auth.uid())
        on conflict(farm_id,source,source_key) do nothing;
      end if;
    end if;
    insert into public.livestock_import_rows(import_id,row_number,animal_id,tag_number,electronic_id_raw,electronic_id,event_date,draft_group,notes,result,error_message,raw_data)
    values(v_import,(v_row->>'rowNumber')::int,v_animal,v_tag,v_raw,v_eid,v_date,v_group,v_row->>'notes',v_result,case when v_result in('ERROR','CONFLICTO') then 'Revisar EID, fecha o caravana' end,v_row);
  end loop;
  select min(event_date) into v_first_date from public.livestock_import_rows where import_id=v_import;
  if v_herd is not null and p_reproductive_status is not null then
    insert into public.reproductive_events(farm_id,herd_id,event_type,event_date,status,animal_count,result,notes,created_by)
    values(p_farm_id,v_herd,'parto',coalesce(v_first_date,now())::date,'realizado',v_created+v_existing,p_reproductive_status,
      concat_ws(' · ',case when p_calving_season is not null then 'Parición de '||lower(p_calving_season) end,'Detectado desde '||p_filename),auth.uid());
  end if;
  update public.livestock_imports set created_animals=v_created,existing_animals=v_existing,error_rows=v_errors,status='completado',detected_at=(select min(event_date) from public.livestock_import_rows where import_id=v_import) where id=v_import;
  return jsonb_build_object('id',v_import,'created',v_created,'existing',v_existing,'errors',v_errors);
end $$;
