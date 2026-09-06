-- Animal History Gallagher: eventos determinísticos y procedencia entre importaciones.
alter table public.animal_events add column if not exists value_text text;

create table if not exists public.livestock_import_event_occurrences(
 import_id uuid not null references public.livestock_imports(id) on delete cascade,
 import_row_id uuid not null references public.livestock_import_rows(id) on delete cascade,
 animal_event_id uuid not null references public.animal_events(id) on delete cascade,
 source_fingerprint text not null,
 external_record_type text not null,
 external_session_name text,
 created_at timestamptz not null default now(),
 primary key(import_id,import_row_id,animal_event_id)
);
create index if not exists livestock_import_event_occurrences_event_idx on public.livestock_import_event_occurrences(animal_event_id);
create index if not exists livestock_import_event_occurrences_fingerprint_idx on public.livestock_import_event_occurrences(source_fingerprint);
alter table public.livestock_import_event_occurrences enable row level security;
drop policy if exists livestock_import_event_occurrences_access on public.livestock_import_event_occurrences;
create policy livestock_import_event_occurrences_access on public.livestock_import_event_occurrences for all to authenticated
 using(exists(select 1 from public.livestock_imports i where i.id=import_id and public.can_access_farm(i.farm_id)))
 with check(exists(select 1 from public.livestock_imports i where i.id=import_id and public.can_manage_farm(i.farm_id)));

create or replace function public.preview_livestock_external_events(p_farm_id uuid,p_events jsonb) returns jsonb
language plpgsql stable security invoker set search_path=public as $$
begin
 if not public.can_access_farm(p_farm_id) then raise exception 'Sin permisos para este establecimiento';end if;
 if jsonb_typeof(p_events)<>'array' then raise exception 'Eventos inválidos';end if;
 return coalesce((select jsonb_agg(distinct candidate->>'fingerprint')
  from jsonb_array_elements(p_events) candidate
  join public.animal_events event on event.farm_id=p_farm_id and event.source='gallagher' and event.voided_at is null
   and (event.source_key=candidate->>'fingerprint' or (
    candidate->>'event_type'='lectura' and event.event_type='lectura' and event.event_date=(candidate->>'event_date')::timestamptz
    and exists(select 1 from public.animals a where a.id=event.animal_id and a.electronic_id=candidate->>'electronic_id')
   ))),'[]'::jsonb);
end $$;

create or replace function public.import_livestock_provider_v3(
 p_farm_id uuid,p_provider text,p_filename text,p_file_hash text,p_rows jsonb,
 p_session_mode text,p_existing_session_id uuid default null,p_session_type text default null,
 p_session_date date default null,p_category_name text default null,p_herd_name text default null,
 p_mapping jsonb default '{}'::jsonb,p_headers jsonb default '[]'::jsonb,p_ignored_headers jsonb default '[]'::jsonb,
 p_mapping_template_id uuid default null,p_filename_keywords jsonb default '[]'::jsonb,
 p_draft_group_decisions jsonb default '{}'::jsonb,p_reactivate_animal_ids jsonb default '[]'::jsonb,
 p_filename_inferences jsonb default '{}'::jsonb,p_filename_confirmed jsonb default '{}'::jsonb,
 p_filename_modified jsonb default '{}'::jsonb
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_result jsonb;v_import uuid;v_session uuid;v_row record;v_external jsonb;v_event uuid;v_fingerprint text;v_event_date timestamptz;
begin
 v_result:=public.import_livestock_provider_v2(p_farm_id,p_provider,p_filename,p_file_hash,p_rows,p_session_mode,
  p_existing_session_id,p_session_type,p_session_date,p_category_name,p_herd_name,p_mapping,p_headers,p_ignored_headers,
  p_mapping_template_id,p_filename_keywords,p_draft_group_decisions,p_reactivate_animal_ids,p_filename_inferences,
  p_filename_confirmed,p_filename_modified);
 v_import:=(v_result->>'id')::uuid;v_session:=nullif(v_result->>'work_session_id','')::uuid;
 for v_row in select * from public.livestock_import_rows where import_id=v_import and animal_id is not null and result in('NUEVO','EXISTENTE') loop
  for v_external in select * from jsonb_array_elements(coalesce(v_row.raw_data->'externalEvents','[]'::jsonb)) loop
   v_fingerprint:=nullif(v_external->>'fingerprint','');
   begin v_event_date:=(v_external->>'eventDate')::timestamptz;exception when others then v_event_date:=null;end;
   if v_fingerprint is null or v_event_date is null or nullif(v_external->>'eventType','') is null then
    raise exception 'Evento Gallagher incompleto en la fila %',v_row.row_number;
   end if;
   v_event:=null;
   if v_external->>'eventType'='lectura' then
    select id into v_event from public.animal_events where animal_id=v_row.animal_id and source=p_provider and event_type='lectura' and event_date=v_event_date and voided_at is null order by created_at limit 1;
    if v_event is not null then update public.animal_events set metadata=metadata||coalesce(v_external->'metadata','{}'::jsonb)||jsonb_build_object('fingerprint',v_fingerprint) where id=v_event;end if;
   end if;
   if v_event is null then
    insert into public.animal_events(animal_id,farm_id,event_type,event_date,source,notes,value_text,metadata,import_id,source_key,created_by,work_session_id)
    values(v_row.animal_id,p_farm_id,v_external->>'eventType',v_event_date,p_provider,nullif(v_external->>'notes',''),
     nullif(v_external->>'value',''),coalesce(v_external->'metadata','{}'::jsonb)||jsonb_build_object('filename',p_filename,'fingerprint',v_fingerprint),
     v_import,v_fingerprint,auth.uid(),v_session)
    on conflict(farm_id,source,source_key) where voided_at is null do nothing returning id into v_event;
   end if;
   if v_event is null then select id into v_event from public.animal_events where farm_id=p_farm_id and source=p_provider and source_key=v_fingerprint and voided_at is null;end if;
   if v_event is null then raise exception 'No se pudo resolver el evento Gallagher de la fila %',v_row.row_number;end if;
   insert into public.livestock_import_event_occurrences(import_id,import_row_id,animal_event_id,source_fingerprint,external_record_type,external_session_name)
   values(v_import,v_row.id,v_event,v_fingerprint,v_external->>'eventType',nullif(v_external->>'externalSessionName','')) on conflict do nothing;
  end loop;
 end loop;
 return v_result||jsonb_build_object('external_events_processed',true);
end $$;

-- Si un evento reapareció en otra importación, una reversión transfiere su origen y no lo anula.
create or replace function public.preserve_reused_gallagher_event() returns trigger language plpgsql set search_path=public as $$
declare v_next_import uuid;
begin
 if old.source='gallagher' and old.voided_at is null and new.voided_at is not null and new.voided_from_import_id=old.import_id then
  select occurrence.import_id into v_next_import from public.livestock_import_event_occurrences occurrence
  join public.livestock_imports i on i.id=occurrence.import_id
  where occurrence.animal_event_id=old.id and occurrence.import_id<>old.import_id and i.status<>'revertido'
  order by occurrence.created_at limit 1;
  if v_next_import is not null then
   new.import_id:=v_next_import;new.voided_at:=null;new.voided_by:=null;new.voided_from_import_id:=null;new.void_reason:=null;
  end if;
 end if;
 return new;
end $$;
drop trigger if exists preserve_reused_gallagher_event_trigger on public.animal_events;
create trigger preserve_reused_gallagher_event_trigger before update of voided_at on public.animal_events
for each row execute function public.preserve_reused_gallagher_event();
