-- Las inferencias del nombre son sugerencias auditables y solo se aplican tras confirmación.
alter table public.livestock_imports
  add column if not exists filename_original text,
  add column if not exists filename_keywords jsonb not null default '[]'::jsonb,
  add column if not exists filename_inferences jsonb not null default '{}'::jsonb,
  add column if not exists filename_inferences_confirmed jsonb not null default '{}'::jsonb,
  add column if not exists filename_inferences_modified_by_user jsonb not null default '{}'::jsonb;

create or replace function public.import_livestock_provider_csv_with_filename_audit(
  p_farm_id uuid, p_provider text, p_filename text, p_file_hash text, p_rows jsonb,
  p_category_name text default null, p_herd_name text default null,
  p_reproductive_status text default null, p_calving_season text default null,
  p_event_type text default null, p_probable_date date default null, p_period text default null,
  p_detected_code text default null, p_filename_keywords jsonb default '[]'::jsonb,
  p_filename_inferences jsonb default '{}'::jsonb, p_filename_confirmed jsonb default '{}'::jsonb,
  p_filename_modified jsonb default '{}'::jsonb
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_result jsonb; v_import uuid; v_event_date timestamptz; v_event_type text;
begin
  -- No enviamos hipótesis reproductivas a funciones anteriores: aquellas interpretaban el valor como parto.
  v_result:=public.import_livestock_provider_csv_with_events(p_farm_id,p_provider,p_filename,p_file_hash,p_rows,p_category_name,p_herd_name,null,null,p_detected_code);
  v_import:=(v_result->>'id')::uuid;
  update public.livestock_imports set filename_original=p_filename,filename_keywords=coalesce(p_filename_keywords,'[]'::jsonb),filename_inferences=coalesce(p_filename_inferences,'{}'::jsonb),filename_inferences_confirmed=coalesce(p_filename_confirmed,'{}'::jsonb),filename_inferences_modified_by_user=coalesce(p_filename_modified,'{}'::jsonb) where id=v_import;
  if nullif(trim(p_event_type),'') is not null then
    v_event_type:=translate(lower(trim(p_event_type)),'áéíóúñ','aeioun');
    select coalesce(p_probable_date::timestamptz,min(event_date),now()) into v_event_date from public.livestock_import_rows where import_id=v_import;
    insert into public.animal_events(animal_id,farm_id,event_type,event_date,source,notes,metadata,import_id,source_key,created_by)
    select distinct r.animal_id,p_farm_id,v_event_type,v_event_date,'filename_confirmed','Contexto confirmado por el usuario',
      jsonb_build_object('filename',p_filename,'period',p_period,'calving_season',p_calving_season,'reproductive_status',p_reproductive_status,'inferred',true,'confirmed',true),
      v_import,r.electronic_id||'|'||v_event_date::text||'|filename|'||v_event_type,auth.uid()
    from public.livestock_import_rows r where r.import_id=v_import and r.animal_id is not null and r.result in('NUEVO','EXISTENTE')
    on conflict(farm_id,source,source_key) do nothing;
  end if;
  return v_result||jsonb_build_object('filename_context_audited',true);
end $$;
