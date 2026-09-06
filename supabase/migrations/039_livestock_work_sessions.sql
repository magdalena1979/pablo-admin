-- Jornadas ganaderas: contexto compartido, participantes y múltiples acciones.
alter table public.animals
  add column if not exists intake_source text,
  add column if not exists first_seen_at timestamptz,
  add column if not exists identified_at timestamptz;

create table if not exists public.livestock_work_sessions (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  herd_id uuid references public.herds(id) on delete set null,
  session_date timestamptz not null,
  session_type text not null default 'otro',
  title text not null,
  source text not null default 'manual',
  status text not null default 'confirmada' check(status in('borrador','confirmada','anulada')),
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.livestock_work_session_actions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.livestock_work_sessions(id) on delete cascade,
  action_type text not null,
  source text not null default 'manual',
  metadata jsonb not null default '{}'::jsonb,
  unique(session_id,action_type)
);

create table if not exists public.livestock_work_session_animals (
  session_id uuid not null references public.livestock_work_sessions(id) on delete cascade,
  animal_id uuid not null references public.animals(id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  primary key(session_id,animal_id)
);

create table if not exists public.herd_snapshots (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  herd_id uuid references public.herds(id) on delete cascade,
  snapshot_date date not null,
  estimated_count integer not null check(estimated_count>=0),
  period text,
  notes text,
  source text not null default 'manual',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.animal_events add column if not exists work_session_id uuid references public.livestock_work_sessions(id) on delete set null;
alter table public.livestock_imports add column if not exists work_session_id uuid references public.livestock_work_sessions(id) on delete set null;
create index if not exists work_sessions_farm_date_idx on public.livestock_work_sessions(farm_id,session_date desc);
create index if not exists animal_events_session_idx on public.animal_events(work_session_id);

alter table public.livestock_work_sessions enable row level security;
alter table public.livestock_work_session_actions enable row level security;
alter table public.livestock_work_session_animals enable row level security;
alter table public.herd_snapshots enable row level security;

create policy work_sessions_access on public.livestock_work_sessions for all to authenticated
  using(public.can_access_farm(farm_id)) with check(public.can_manage_farm(farm_id) and created_by=auth.uid());
create policy work_session_actions_access on public.livestock_work_session_actions for all to authenticated
  using(exists(select 1 from public.livestock_work_sessions s where s.id=session_id and public.can_access_farm(s.farm_id)))
  with check(exists(select 1 from public.livestock_work_sessions s where s.id=session_id and public.can_manage_farm(s.farm_id)));
create policy work_session_animals_access on public.livestock_work_session_animals for all to authenticated
  using(exists(select 1 from public.livestock_work_sessions s where s.id=session_id and public.can_access_farm(s.farm_id)))
  with check(exists(select 1 from public.livestock_work_sessions s where s.id=session_id and public.can_manage_farm(s.farm_id)));
create policy herd_snapshots_access on public.herd_snapshots for all to authenticated
  using(public.can_access_farm(farm_id)) with check(public.can_manage_farm(farm_id) and created_by=auth.uid());

create or replace function public.import_livestock_provider_with_work_session(
  p_farm_id uuid, p_provider text, p_filename text, p_file_hash text, p_rows jsonb,
  p_category_name text default null, p_herd_name text default null,
  p_reproductive_status text default null, p_calving_season text default null,
  p_session_confirmed boolean default false, p_session_type text default null,
  p_session_date date default null, p_period text default null,
  p_detected_code text default null, p_filename_keywords jsonb default '[]'::jsonb,
  p_filename_inferences jsonb default '{}'::jsonb, p_filename_confirmed jsonb default '{}'::jsonb,
  p_filename_modified jsonb default '{}'::jsonb
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_result jsonb; v_import uuid; v_session uuid; v_date timestamptz; v_herd uuid; v_action text;
begin
  -- El contexto inferido queda auditado, pero no genera por sí solo eventos individuales.
  v_result:=public.import_livestock_provider_csv_with_filename_audit(
    p_farm_id,p_provider,p_filename,p_file_hash,p_rows,p_category_name,p_herd_name,
    p_reproductive_status,p_calving_season,null,null,p_period,p_detected_code,
    p_filename_keywords,p_filename_inferences,p_filename_confirmed,p_filename_modified);
  v_import:=(v_result->>'id')::uuid;
  select min(event_date) into v_date from public.livestock_import_rows where import_id=v_import;
  update public.animals a set intake_source=coalesce(a.intake_source,p_provider),first_seen_at=coalesce(a.first_seen_at,v_date,now())
  where exists(select 1 from public.livestock_import_rows r where r.import_id=v_import and r.animal_id=a.id and r.result='NUEVO');

  if p_session_confirmed and nullif(trim(p_session_type),'') is not null then
    if nullif(trim(p_herd_name),'') is not null then select id into v_herd from public.herds where farm_id=p_farm_id and lower(name)=lower(trim(p_herd_name)) limit 1; end if;
    insert into public.livestock_work_sessions(farm_id,herd_id,session_date,session_type,title,source,status,notes,created_by)
    values(p_farm_id,v_herd,coalesce(p_session_date::timestamptz,v_date,now()),translate(lower(trim(p_session_type)),'áéíóúñ','aeioun'),trim(p_session_type)||' · '||p_filename,p_provider,'confirmada','Contexto confirmado por el usuario durante la importación',auth.uid()) returning id into v_session;
    insert into public.livestock_work_session_animals(session_id,animal_id,metadata)
    select distinct v_session,animal_id,jsonb_build_object('import_id',v_import) from public.livestock_import_rows where import_id=v_import and animal_id is not null and result in('NUEVO','EXISTENTE');
    for v_action in select distinct jsonb_array_elements_text(coalesce(raw_data->'detectedEventTypes','[]'::jsonb)) from public.livestock_import_rows where import_id=v_import loop
      insert into public.livestock_work_session_actions(session_id,action_type,source,metadata) values(v_session,v_action,p_provider,jsonb_build_object('explicit_csv',true)) on conflict do nothing;
    end loop;
    insert into public.livestock_work_session_actions(session_id,action_type,source,metadata) values(v_session,translate(lower(trim(p_session_type)),'áéíóúñ','aeioun'),'filename_confirmed',jsonb_build_object('inferred',true,'confirmed',true)) on conflict do nothing;
    update public.animal_events set work_session_id=v_session where import_id=v_import;
    update public.livestock_imports set work_session_id=v_session where id=v_import;
    if translate(lower(trim(p_session_type)),'áéíóúñ','aeioun') in('caravaneo','identificacion') then
      update public.animals a set identified_at=coalesce(a.identified_at,coalesce(p_session_date::timestamptz,v_date,now())) where exists(select 1 from public.livestock_work_session_animals x where x.session_id=v_session and x.animal_id=a.id);
    end if;
  end if;
  return v_result||jsonb_build_object('work_session_id',v_session);
end $$;
