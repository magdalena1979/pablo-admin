-- Importación flexible: fecha ganadera explícita, catálogos y procedencia exacta.
create or replace function public.import_livestock_provider_v2(
 p_farm_id uuid,p_provider text,p_filename text,p_file_hash text,p_rows jsonb,
 p_session_mode text,p_existing_session_id uuid default null,p_session_type text default null,
 p_session_date date default null,p_category_name text default null,p_herd_name text default null,
 p_mapping jsonb default '{}'::jsonb,p_headers jsonb default '[]'::jsonb,p_ignored_headers jsonb default '[]'::jsonb,
 p_mapping_template_id uuid default null,p_filename_keywords jsonb default '[]'::jsonb,
 p_draft_group_decisions jsonb default '{}'::jsonb,p_reactivate_animal_ids jsonb default '[]'::jsonb,
 p_filename_inferences jsonb default '{}'::jsonb,p_filename_confirmed jsonb default '{}'::jsonb,
 p_filename_modified jsonb default '{}'::jsonb
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare
 v_result jsonb;v_import uuid;v_session uuid;v_date timestamptz;v_row record;v_group text;v_herd uuid;
 v_action text;v_action_code text;v_action_id uuid;v_action_type_id uuid;v_session_type_id uuid;v_sanitized jsonb;
 v_decision jsonb;v_decision_mode text;v_decision_herd uuid;
begin
 if p_session_mode not in('new','existing','none') then raise exception 'Modo de jornada inválido';end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)=0 then raise exception 'La importación no contiene filas';end if;
 if exists(select 1 from jsonb_array_elements(p_rows) item where nullif(trim(item->>'eventDate'),'') is null) and p_session_date is null then
  raise exception 'Hay filas sin fecha. Indicá la fecha de la jornada o de la información';
 end if;

 if p_session_mode='existing' then
  select id into v_session from public.livestock_work_sessions where id=p_existing_session_id and farm_id=p_farm_id and status<>'anulada';
  if v_session is null then raise exception 'La jornada seleccionada no existe o no pertenece al establecimiento';end if;
 end if;

 if exists(
  select 1 from jsonb_array_elements(p_rows) row_data
  join public.animals a on a.farm_id=p_farm_id
   and a.electronic_id=regexp_replace(coalesce(row_data->>'electronicId',row_data->>'electronicIdRaw',''),'[^0-9A-Za-z]','','g')
  where a.reverted_at is not null and not (p_reactivate_animal_ids ? a.id::text)
 ) then raise exception 'El archivo contiene animales revertidos que requieren reactivación explícita';end if;

 -- Cada Draft Group requiere una decisión visible y explícita del preview.
 if exists(
  select 1 from (select distinct nullif(trim(item->>'draftGroup'),'') value from jsonb_array_elements(p_rows) item) groups
  where value is not null and not (p_draft_group_decisions ? value)
 ) then raise exception 'Falta confirmar la decisión de uno o más Draft Group';end if;

 -- Materializa la fecha confirmada antes de invocar el importador anterior.
 select jsonb_agg(
  (item-'draftGroup'-'eventDate')||jsonb_build_object(
   'explicitDraftGroup',item->>'draftGroup','draftGroup','',
   'eventDate',coalesce(nullif(trim(item->>'eventDate'),''),p_session_date::text)
  ) order by ordinality
 ) into v_sanitized
 from jsonb_array_elements(p_rows) with ordinality source(item,ordinality);

 if exists(select 1 from jsonb_array_elements(v_sanitized) item where nullif(trim(item->>'eventDate'),'') is null) then
  raise exception 'No se pudo resolver la fecha ganadera de todas las filas';
 end if;

 v_result:=public.import_livestock_provider_csv_with_filename_audit(
  p_farm_id,p_provider,p_filename,p_file_hash,v_sanitized,p_category_name,p_herd_name,
  null,null,null,null,null,null,p_filename_keywords,p_filename_inferences,p_filename_confirmed,p_filename_modified);
 v_import:=(v_result->>'id')::uuid;

 update public.livestock_imports set
 detected_headers=p_headers,applied_mapping=p_mapping,ignored_headers=p_ignored_headers,
  mapping_template_id=p_mapping_template_id,session_mode=p_session_mode,draft_group_decisions=p_draft_group_decisions,content_hash=p_file_hash
 where id=v_import;

 select min(event_date) into v_date from public.livestock_import_rows where import_id=v_import and result in('NUEVO','EXISTENTE');
 if exists(select 1 from public.livestock_import_rows where import_id=v_import and result in('NUEVO','EXISTENTE') and event_date is null) then
  raise exception 'Una fila aceptada quedó sin fecha ganadera';
 end if;

 for v_row in select * from public.livestock_import_rows where import_id=v_import and animal_id is not null and result in('NUEVO','EXISTENTE') loop
  v_group:=nullif(trim(v_row.raw_data->>'explicitDraftGroup'),'');
  if v_group is not null then
   v_decision:=p_draft_group_decisions->v_group;v_decision_mode:=v_decision->>'mode';v_decision_herd:=null;
   if v_decision_mode='existing' then
    begin v_decision_herd:=(v_decision->>'herd_id')::uuid;exception when others then raise exception 'Rodeo inválido para Draft Group %',v_group;end;
    if not exists(select 1 from public.herds where id=v_decision_herd and farm_id=p_farm_id and active) then raise exception 'El rodeo elegido para % no existe en el establecimiento',v_group;end if;
   elsif v_decision_mode='create' then
    if coalesce((v_decision->>'confirmed')::boolean,false) is not true or nullif(trim(v_decision->>'name'),'') is null then
     raise exception 'Crear el rodeo para % requiere confirmación explícita',v_group;
    end if;
    insert into public.herds(farm_id,name) values(p_farm_id,trim(v_decision->>'name'))
     on conflict(farm_id,name) do update set active=true returning id into v_decision_herd;
   elsif v_decision_mode<>'ignore' then raise exception 'Decisión inválida para Draft Group %',v_group;
   end if;
   if v_decision_herd is not null then update public.animals set herd_id=v_decision_herd,updated_at=now() where id=v_row.animal_id;end if;
   update public.livestock_import_rows set draft_group=case when v_decision_mode='ignore' then null else v_group end where id=v_row.id;
  end if;
  update public.animals set
   breed=coalesce(breed,nullif(v_row.raw_data->>'breed','')),
   sex=coalesce(sex,case lower(v_row.raw_data->>'sex') when 'male' then 'macho' when 'macho' then 'macho' when 'female' then 'hembra' when 'hembra' then 'hembra' end),
   intake_source=coalesce(intake_source,p_provider),first_seen_at=coalesce(first_seen_at,v_row.event_date),updated_at=now()
  where id=v_row.animal_id;

  if nullif(v_row.raw_data->>'bodyConditionScore','') is not null then
   insert into public.animal_events(animal_id,farm_id,event_type,event_date,source,metadata,import_id,source_key,created_by)
   values(v_row.animal_id,p_farm_id,'condicion_corporal',v_row.event_date,p_provider,
    jsonb_build_object('score',v_row.raw_data->'bodyConditionScore','filename',p_filename),v_import,
    v_row.electronic_id||'|'||v_row.event_date::text||'|condicion',auth.uid()) on conflict do nothing;
  end if;
  if nullif(v_row.raw_data->>'pregnancyStatus','') is not null then
   insert into public.animal_events(animal_id,farm_id,event_type,event_date,source,metadata,import_id,source_key,created_by)
   values(v_row.animal_id,p_farm_id,'estado_reproductivo',v_row.event_date,p_provider,
    jsonb_build_object('status',v_row.raw_data->'pregnancyStatus','filename',p_filename),v_import,
    v_row.electronic_id||'|'||v_row.event_date::text||'|reproduccion',auth.uid()) on conflict do nothing;
  end if;
 end loop;

 update public.animals a set active=true,status='activo',reverted_at=null,reverted_by=null,reverted_from_import_id=null,reversal_reason=null,updated_at=now()
 where p_reactivate_animal_ids ? a.id::text
  and exists(select 1 from public.livestock_import_rows r where r.import_id=v_import and r.animal_id=a.id and r.result='EXISTENTE');

 if p_session_mode='new' then
  if nullif(trim(p_session_type),'') is null or p_session_date is null then raise exception 'La jornada nueva requiere tipo y fecha';end if;
  select id into v_session_type_id from public.livestock_session_type_catalog
   where active and code=public.livestock_catalog_code(p_session_type) limit 1;
  if v_session_type_id is null then select id into v_session_type_id from public.livestock_session_type_catalog where active and code='otro' limit 1;end if;
  insert into public.livestock_work_sessions(
   farm_id,session_date,type_id,session_type,title,source,status,created_by,created_from_import_id
  ) values(
   p_farm_id,p_session_date::timestamptz,v_session_type_id,public.livestock_catalog_code(p_session_type),
   trim(p_session_type)||' · '||p_filename,p_provider,'borrador',auth.uid(),v_import
  ) returning id into v_session;
 end if;

 if v_session is not null then
  insert into public.livestock_work_session_animals(session_id,animal_id,metadata,created_from_import_id)
   select distinct v_session,animal_id,jsonb_build_object('import_id',v_import),v_import
   from public.livestock_import_rows where import_id=v_import and animal_id is not null and result in('NUEVO','EXISTENTE')
   on conflict(session_id,animal_id) do nothing;
  insert into public.livestock_work_session_animal_imports(session_id,animal_id,import_id)
   select distinct v_session,animal_id,v_import from public.livestock_import_rows
   where import_id=v_import and animal_id is not null and result in('NUEVO','EXISTENTE') on conflict do nothing;

  for v_action in
   select distinct jsonb_array_elements_text(coalesce(raw_data->'detectedEventTypes','[]'::jsonb))
   from public.livestock_import_rows where import_id=v_import and animal_id is not null and result in('NUEVO','EXISTENTE')
  loop
   v_action_code:=public.livestock_catalog_code(v_action);
   select id into v_action_type_id from public.livestock_action_type_catalog
    where active and (code=v_action_code or event_type=v_action_code) order by case when code=v_action_code then 0 else 1 end limit 1;
   if v_action_type_id is null then select id into v_action_type_id from public.livestock_action_type_catalog where active and code='otro' limit 1;end if;

   insert into public.livestock_work_session_actions(session_id,action_type_id,action_type,source,metadata,created_from_import_id)
   values(v_session,v_action_type_id,v_action_code,p_provider,jsonb_build_object('explicit_csv',true,'import_id',v_import),v_import)
   on conflict(session_id,action_type) do update set action_type_id=coalesce(public.livestock_work_session_actions.action_type_id,excluded.action_type_id)
   returning id into v_action_id;

   insert into public.livestock_work_session_action_imports(action_id,import_id) values(v_action_id,v_import) on conflict do nothing;

   insert into public.livestock_work_session_action_animals(action_id,animal_id,created_from_import_id,metadata)
    select distinct v_action_id,r.animal_id,v_import,jsonb_build_object('import_id',v_import)
    from public.livestock_import_rows r
    where r.import_id=v_import and r.animal_id is not null and r.result in('NUEVO','EXISTENTE')
     and coalesce(r.raw_data->'detectedEventTypes','[]'::jsonb) ? v_action
    on conflict(action_id,animal_id) do nothing;
   insert into public.livestock_work_session_action_animal_imports(action_id,animal_id,import_id)
    select distinct v_action_id,r.animal_id,v_import from public.livestock_import_rows r
    where r.import_id=v_import and r.animal_id is not null and r.result in('NUEVO','EXISTENTE')
     and coalesce(r.raw_data->'detectedEventTypes','[]'::jsonb) ? v_action
    on conflict do nothing;
  end loop;

  update public.animal_events set work_session_id=v_session where import_id=v_import;
  update public.livestock_imports set work_session_id=v_session where id=v_import;
 end if;

 insert into public.livestock_import_audit_logs(import_id,action,detail,performed_by)
 values(v_import,'importar',jsonb_build_object(
  'session_mode',p_session_mode,'session_id',v_session,'session_created',p_session_mode='new',
  'mapping',p_mapping,'resolved_date',p_session_date,'draft_group_decisions',p_draft_group_decisions,
  'reactivated_animal_ids',p_reactivate_animal_ids
 ),auth.uid());
 return v_result||jsonb_build_object('work_session_id',v_session,'work_session_status',case when p_session_mode='new' then 'borrador' end);
end $$;

create or replace function public.confirm_livestock_work_session(p_session_id uuid) returns void
language plpgsql security invoker set search_path=public as $$
declare v_farm uuid;
begin
 select farm_id into v_farm from public.livestock_work_sessions where id=p_session_id and status='borrador';
 if v_farm is null or not public.can_manage_farm(v_farm) then raise exception 'Jornada inexistente, ya confirmada o sin permisos';end if;
 update public.livestock_work_sessions set status='confirmada',confirmed_by=auth.uid(),confirmed_at=now(),updated_at=now() where id=p_session_id;
end $$;
