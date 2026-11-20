begin;

alter table public.ear_tags drop constraint if exists ear_tags_status_check;
alter table public.ear_tags add constraint ear_tags_status_check check(status in ('disponible','utilizada'));
alter table public.ear_tags
  add column animal_id uuid references public.animals(id) on delete restrict,
  add column used_at timestamptz,
  add column used_by uuid references public.profiles(id) on delete restrict;
alter table public.ear_tags add constraint ear_tags_usage_check check (
  (status='disponible' and animal_id is null and used_at is null and used_by is null)
  or (status='utilizada' and animal_id is not null and used_at is not null and used_by is not null)
);
create index ear_tags_animal_idx on public.ear_tags(animal_id) where animal_id is not null;

-- File-level receipt makes confirmation atomic across clients, farms and dates.
create table public.gallagher_csv_confirmations (
  id uuid primary key default gen_random_uuid(),
  file_hash text not null unique check(file_hash ~ '^[a-f0-9]{64}$'),
  filename_original text not null,
  source_headers jsonb not null,
  source_rows jsonb not null,
  summary jsonb not null default '{}'::jsonb,
  imported_by uuid not null references public.profiles(id),
  imported_at timestamptz not null default now()
);
create table public.ear_tag_session_links (
  tag_id uuid not null references public.ear_tags(id) on delete restrict,
  animal_id uuid not null references public.animals(id) on delete restrict,
  session_id uuid not null references public.livestock_work_sessions(id) on delete restrict,
  import_id uuid not null references public.livestock_imports(id) on delete restrict,
  confirmation_id uuid not null references public.gallagher_csv_confirmations(id) on delete restrict,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key(tag_id,session_id,import_id)
);
create index ear_tag_session_links_confirmation_idx on public.ear_tag_session_links(confirmation_id);
create index ear_tag_session_links_session_idx on public.ear_tag_session_links(session_id);
create index ear_tag_session_links_import_idx on public.ear_tag_session_links(import_id);
alter table public.gallagher_csv_confirmations enable row level security;
alter table public.ear_tag_session_links enable row level security;
revoke all on public.gallagher_csv_confirmations, public.ear_tag_session_links from public, anon, authenticated;
grant select on public.gallagher_csv_confirmations, public.ear_tag_session_links to authenticated;
create policy csv_confirmations_super_read on public.gallagher_csv_confirmations for select to authenticated using(public.is_super_admin());
create policy tag_session_links_read on public.ear_tag_session_links for select to authenticated
using(exists(select 1 from public.livestock_work_sessions s where s.id=session_id and public.can_access_farm(s.farm_id)));

create view public.ear_tag_stock_by_range with(security_invoker=true) as
select r.id as range_id, r.receipt_id,
  count(t.id) filter(where t.status='disponible')::integer as available,
  count(t.id) filter(where t.status='utilizada')::integer as used
from public.ear_tag_ranges r left join public.ear_tags t on t.range_id=r.id group by r.id,r.receipt_id;
grant select on public.ear_tag_stock_by_range to authenticated;

create function public.confirm_gallagher_csv_links(
  p_filename text, p_file_hash text, p_headers jsonb, p_rows jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_confirmation uuid; v_existing jsonb; v_item jsonb; v_group record; v_tag record;
  v_animal public.animals%rowtype; v_visual public.animals%rowtype;
  v_eid text; v_visual_tag text; v_time text; v_date date; v_event timestamptz;
  v_normalized jsonb := '[]'::jsonb; v_row jsonb; v_result jsonb;
  v_import uuid; v_session uuid; v_sessions jsonb := '[]'::jsonb;
  v_participants jsonb := '[]'::jsonb; v_created integer := 0; v_known integer := 0;
  v_used integer := 0; v_total integer; v_now timestamptz := now();
begin
  if auth.uid() is null or not coalesce(public.is_super_admin(),false) then
    raise exception 'No tenés permiso para confirmar la vinculación' using errcode='42501';
  end if;
  if nullif(trim(p_filename),'') is null or p_file_hash is null or p_file_hash !~ '^[a-f0-9]{64}$' then raise exception 'Archivo o hash inválido'; end if;
  if p_rows is null or jsonb_typeof(p_rows)<>'array' then raise exception 'El archivo no contiene filas'; end if;
  v_total := jsonb_array_length(p_rows);
  if v_total=0 or v_total>10000 then raise exception 'El archivo debe tener entre 1 y 10000 lecturas'; end if;
  if p_headers is null or jsonb_typeof(p_headers)<>'array' then raise exception 'Faltan los encabezados originales'; end if;

  perform pg_advisory_xact_lock(hashtextextended('gallagher-csv:'||p_file_hash,0));
  select id,summary into v_confirmation,v_existing from public.gallagher_csv_confirmations where file_hash=p_file_hash;
  if found then return v_existing||jsonb_build_object('already_imported',true,'confirmation_id',v_confirmation); end if;

  -- Lock stock and existing animals in stable order before validating or writing.
  perform t.id from public.ear_tags t
  where t.electronic_id in(select regexp_replace(value->>'eid','\s','','g') from jsonb_array_elements(p_rows))
  order by t.electronic_id for update;
  perform a.id from public.animals a
  where a.electronic_id in(select regexp_replace(value->>'eid','\s','','g') from jsonb_array_elements(p_rows))
     or a.tag_number in(select value->>'tag' from jsonb_array_elements(p_rows))
  order by a.id for update;

  for v_item in select value from jsonb_array_elements(p_rows) order by value->>'eid',value->>'date',value->>'time' loop
    v_eid := regexp_replace(v_item->>'eid','\s','','g');
    v_visual_tag := nullif(trim(v_item->>'tag'),'');
    if v_eid is null or v_eid !~ '^[0-9]{15}$' or v_visual_tag is null then raise exception 'Fila %: falta EID válido o caravana visual',v_item->>'row'; end if;
    if coalesce(v_item->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Fila %: fecha no reconocida; se espera AAAA-MM-DD',v_item->>'row'; end if;
    v_date := (v_item->>'date')::date;
    v_time := nullif(trim(v_item->>'time'),'');
    if v_time is not null and v_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$' then raise exception 'Fila %: hora inválida',v_item->>'row'; end if;
    v_event := (v_date::text||' '||coalesce(v_time,'00:00:00'))::timestamp at time zone 'America/Argentina/Buenos_Aires';
    if jsonb_typeof(v_item->'rawCsv') is distinct from 'object' then raise exception 'Fila %: faltan los datos originales',v_item->>'row'; end if;

    select t.id,t.status,t.animal_id,r.target_sex,receipt.renspa_id,f.id as farm_id,c.id as client_id
    into v_tag from public.ear_tags t
    join public.ear_tag_ranges r on r.id=t.range_id
    join public.ear_tag_receipts receipt on receipt.id=r.receipt_id
    join public.farm_renspas registry on registry.id=receipt.renspa_id
    join public.farms f on f.id=registry.farm_id
    join public.clients c on c.id=f.client_id
    where t.electronic_id=v_eid and f.active and c.active;
    if not found then raise exception 'EID %: caravana sin alta previa vigente. No se guardó el archivo',v_eid; end if;
    if (v_item->>'expectedRenspaId') is distinct from v_tag.renspa_id::text
      or (v_item->>'expectedFarmId') is distinct from v_tag.farm_id::text
      or (v_item->>'expectedClientId') is distinct from v_tag.client_id::text
      or (v_item->>'expectedSex') is distinct from v_tag.target_sex then
      raise exception 'EID %: cambió la pertenencia o el sexo desde la revisión. Volvé a revisar el CSV',v_eid;
    end if;
    if nullif(v_item->>'sex','') is not null and v_item->>'sex'<>v_tag.target_sex then raise exception 'EID %: el sexo del CSV contradice el rango',v_eid; end if;
    select * into v_animal from public.animals where farm_id=v_tag.farm_id and electronic_id=v_eid;
    if found then
      if not v_animal.active or v_animal.reverted_at is not null or v_animal.status='revertido' then raise exception 'EID %: el animal está inactivo o revertido',v_eid; end if;
      if v_animal.tag_number<>v_visual_tag then raise exception 'EID %: conflicto de caravana visual',v_eid; end if;
      if v_animal.sex is not null and v_animal.sex<>v_tag.target_sex then raise exception 'EID %: conflicto de sexo del animal',v_eid; end if;
    end if;
    if exists(select 1 from public.animals where electronic_id=v_eid and farm_id<>v_tag.farm_id) then raise exception 'EID %: pertenece a otro establecimiento. Requiere revisión',v_eid; end if;
    select * into v_visual from public.animals where farm_id=v_tag.farm_id and tag_number=v_visual_tag;
    if found and v_visual.electronic_id is distinct from v_eid then raise exception 'Caravana visual %: ya pertenece a otro animal',v_visual_tag; end if;
    if v_tag.status='utilizada' and (v_animal.id is null or v_tag.animal_id is distinct from v_animal.id) then raise exception 'EID %: caravana utilizada por otro animal o vínculo incompleto',v_eid; end if;
    if v_tag.status not in('disponible','utilizada') then raise exception 'EID %: estado de caravana inválido',v_eid; end if;

    v_row := jsonb_build_object(
      'rowNumber',(v_item->>'row')::integer,'tagNumber',v_visual_tag,'electronicId',v_eid,
      'electronicIdRaw',v_eid,'eventDate',v_event,'draftGroup','','notes',coalesce(v_item->>'notes',''),
      'sex',v_tag.target_sex,'externalEvents','[]'::jsonb,'detectedEventTypes','[]'::jsonb,
      'rawCsv',v_item->'rawCsv','sourceDate',v_date,'sourceTime',v_time,
      'datePrecision',case when v_time is null then 'date' else 'datetime' end,
      'renspaId',v_tag.renspa_id,'farmId',v_tag.farm_id,'earTagId',v_tag.id);
    if exists(select 1 from jsonb_array_elements(v_normalized) x where x->>'electronicId'=v_eid and x->>'eventDate'=v_row->>'eventDate') then raise exception 'EID %: lectura repetida en la misma fecha y hora',v_eid; end if;
    if exists(select 1 from jsonb_array_elements(v_normalized) x where x->>'farmId'=v_tag.farm_id::text and x->>'tagNumber'=v_visual_tag and x->>'electronicId'<>v_eid) then raise exception 'La caravana visual % se repite con distintos EID',v_visual_tag; end if;
    v_normalized := v_normalized||jsonb_build_array(v_row);
  end loop;

  insert into public.gallagher_csv_confirmations(file_hash,filename_original,source_headers,source_rows,imported_by)
  values(p_file_hash,trim(p_filename),p_headers,p_rows,auth.uid()) returning id into v_confirmation;
  -- One session per RENSPA and explicit date; a shared CSV may span farms.
  for v_group in select x->>'farmId' as farm_id,x->>'renspaId' as renspa_id,x->>'sourceDate' as session_date,
      jsonb_agg(x order by (x->>'rowNumber')::integer) as rows
    from jsonb_array_elements(v_normalized) x group by x->>'farmId',x->>'renspaId',x->>'sourceDate'
    order by x->>'farmId',x->>'renspaId',x->>'sourceDate'
  loop
    v_result := public.import_livestock_provider_v3(
      p_farm_id:=v_group.farm_id::uuid,p_provider:='gallagher',p_filename:=p_filename,
      p_file_hash:=p_file_hash||':'||v_group.renspa_id||':'||v_group.session_date,
      p_rows:=v_group.rows,p_session_mode:='new',p_session_type:='Otro',p_session_date:=v_group.session_date::date,
      p_headers:=p_headers,p_filename_inferences:='{}'::jsonb,p_filename_confirmed:='{}'::jsonb);
    v_import := (v_result->>'id')::uuid; v_session := (v_result->>'work_session_id')::uuid;
    if v_import is null or v_session is null or coalesce((v_result->>'errors')::integer,0)<>0 then raise exception 'Se detectó un conflicto al importar. No se guardó ninguna parte del archivo'; end if;
    if (select count(*) from public.livestock_import_rows where import_id=v_import and animal_id is not null and result in('NUEVO','EXISTENTE'))<>jsonb_array_length(v_group.rows) then raise exception 'No se pudieron vincular todas las filas. No se guardó el archivo'; end if;
    update public.livestock_imports set content_hash=p_file_hash where id=v_import;
    for v_row in select value from jsonb_array_elements(v_group.rows) loop
      select * into v_animal from public.animals where farm_id=v_group.farm_id::uuid and electronic_id=v_row->>'electronicId' for update;
      if v_animal.id is null or v_animal.tag_number<>v_row->>'tagNumber' or v_animal.sex is distinct from v_row->>'sex' then raise exception 'EID %: conflicto durante la vinculación',v_row->>'electronicId'; end if;
      update public.ear_tags set status='utilizada',animal_id=v_animal.id,used_at=v_now,used_by=auth.uid()
      where id=(v_row->>'earTagId')::uuid and status='disponible';
      if found then v_used:=v_used+1; end if;
      insert into public.ear_tag_session_links(tag_id,animal_id,session_id,import_id,confirmation_id,created_by)
      values((v_row->>'earTagId')::uuid,v_animal.id,v_session,v_import,v_confirmation,auth.uid()) on conflict do nothing;
      v_participants := v_participants||jsonb_build_array(v_animal.id);
    end loop;
    perform public.confirm_livestock_work_session(v_session);
    insert into public.audit_logs(actor_id,farm_id,entity_type,entity_id,action,new_data)
    values(auth.uid(),v_group.farm_id::uuid,'gallagher_csv_confirmation',v_confirmation::text,'Vinculación de caravanas con Gallagher',
      jsonb_build_object('filename',p_filename,'file_hash',p_file_hash,'session_id',v_session,'import_id',v_import,'renspa_id',v_group.renspa_id));
    v_sessions:=v_sessions||jsonb_build_array(jsonb_build_object('session_id',v_session,'import_id',v_import,'farm_id',v_group.farm_id,'renspa_id',v_group.renspa_id,'date',v_group.session_date));
    v_created:=v_created+coalesce((v_result->>'created')::integer,0);
    v_known:=v_known+coalesce((v_result->>'existing')::integer,0);
  end loop;
  v_result:=jsonb_build_object('confirmation_id',v_confirmation,'already_imported',false,'readings',v_total,
    'animals',(select count(distinct value) from jsonb_array_elements_text(v_participants)),
    'created',v_created,'existing',v_known,'tags_used',v_used,'sessions',v_sessions);
  update public.gallagher_csv_confirmations set summary=v_result where id=v_confirmation;
  return v_result;
end;
$$;
revoke all on function public.confirm_gallagher_csv_links(text,text,jsonb,jsonb) from public,anon;
grant execute on function public.confirm_gallagher_csv_links(text,text,jsonb,jsonb) to authenticated;

-- Reverse/annul cannot silently invalidate a used tag's provenance. A dedicated
-- reviewed reversal flow is required before linked imports can be undone.
create function public.protect_ear_tag_linked_import() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.status is distinct from old.status and new.status in('revertido','anulado')
    and exists(select 1 from public.ear_tag_session_links where import_id=old.id) then
    raise exception 'La importación tiene caravanas utilizadas vinculadas. Requiere una reversión específica para conservar su trazabilidad';
  end if;
  return new;
end; $$;
revoke all on function public.protect_ear_tag_linked_import() from public;
create trigger protect_ear_tag_linked_import before update of status on public.livestock_imports for each row execute function public.protect_ear_tag_linked_import();

notify pgrst,'reload schema';
commit;
