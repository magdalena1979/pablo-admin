-- Aplica metadatos inferidos del nombre del archivo sin modificar importaciones ya ejecutadas.
alter table public.health_events add column if not exists responsible text;

create or replace function public.import_livestock_provider_csv_with_context(
  p_farm_id uuid, p_provider text, p_filename text, p_file_hash text, p_rows jsonb,
  p_category_name text default null, p_herd_name text default null,
  p_reproductive_status text default null, p_calving_season text default null,
  p_detected_code text default null
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_result jsonb; v_import uuid; v_category uuid; v_herd uuid; v_count integer; v_date date;
begin
  v_result:=public.import_livestock_provider_csv(p_farm_id,p_provider,p_filename,p_file_hash,p_rows);
  v_import:=(v_result->>'id')::uuid;
  if nullif(trim(p_category_name),'') is not null then
    select id into v_category from public.livestock_categories where lower(name)=lower(trim(p_category_name)) limit 1;
    if v_category is null then insert into public.livestock_categories(name) values(trim(p_category_name)) returning id into v_category; end if;
  end if;
  if nullif(trim(p_herd_name),'') is not null then
    insert into public.herds(farm_id,category_id,name) values(p_farm_id,v_category,trim(p_herd_name))
    on conflict(farm_id,name) do update set category_id=coalesce(public.herds.category_id,excluded.category_id),active=true returning id into v_herd;
  end if;
  update public.animals a set herd_id=coalesce(a.herd_id,v_herd),category_id=coalesce(a.category_id,v_category),updated_at=now()
  where exists(select 1 from public.livestock_import_rows r where r.import_id=v_import and r.animal_id=a.id and r.result in('NUEVO','EXISTENTE'));
  update public.animal_events set metadata=metadata||jsonb_build_object('category_suggested',p_category_name,'herd_suggested',p_herd_name,'reproductive_status',p_reproductive_status,'calving_season',p_calving_season,'detected_code',p_detected_code)
  where import_id=v_import;
  select count(*),min(event_date)::date into v_count,v_date from public.livestock_import_rows where import_id=v_import and result in('NUEVO','EXISTENTE');
  if v_herd is not null and p_reproductive_status is not null and v_count>0 then
    insert into public.reproductive_events(farm_id,herd_id,event_type,event_date,status,animal_count,result,notes,created_by)
    select p_farm_id,v_herd,'parto',coalesce(v_date,current_date),'realizado',v_count,p_reproductive_status,
      concat_ws(' · ',case when p_calving_season is not null then 'Parición de '||lower(p_calving_season) end,'Detectado desde '||p_filename),auth.uid()
    where not exists(select 1 from public.reproductive_events where farm_id=p_farm_id and herd_id=v_herd and notes like '%'||p_filename||'%');
  end if;
  return v_result||jsonb_build_object('category',p_category_name,'herd',p_herd_name,'reproductive_status',p_reproductive_status,'calving_season',p_calving_season);
end $$;
