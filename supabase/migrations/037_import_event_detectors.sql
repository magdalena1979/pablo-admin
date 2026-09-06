-- Detectores extensibles para pesajes y tratamientos presentes en CSV de proveedores.
create or replace function public.import_livestock_provider_csv_with_events(
  p_farm_id uuid, p_provider text, p_filename text, p_file_hash text, p_rows jsonb,
  p_category_name text default null, p_herd_name text default null,
  p_reproductive_status text default null, p_calving_season text default null,
  p_detected_code text default null
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_result jsonb; v_import uuid; v_row record; v_event text; v_group text; v_category_name text; v_category uuid; v_herd uuid;
begin
  v_result:=public.import_livestock_provider_csv_with_context(p_farm_id,p_provider,p_filename,p_file_hash,p_rows,p_category_name,p_herd_name,p_reproductive_status,p_calving_season,p_detected_code);
  v_import:=(v_result->>'id')::uuid;
  for v_row in select * from public.livestock_import_rows where import_id=v_import and animal_id is not null and result in('NUEVO','EXISTENTE') loop
    v_group:=nullif(trim(v_row.draft_group),'');
    if v_group is not null then
      v_category_name:=case when lower(v_group) like '%vaquillona%' then 'Vaquillona' when lower(v_group) like '%novillo%' then 'Novillo' when lower(v_group) like '%ternera%' then 'Ternera' when lower(v_group) like '%ternero%' then 'Ternero' when lower(v_group) like '%vaca%' or lower(v_group) like '%madre%' then 'Vaca' else null end;
      v_category:=null;
      if v_category_name is not null then select id into v_category from public.livestock_categories where lower(name)=lower(v_category_name) limit 1; end if;
      insert into public.herds(farm_id,category_id,name) values(p_farm_id,v_category,v_group)
      on conflict(farm_id,name) do update set category_id=coalesce(public.herds.category_id,excluded.category_id),active=true returning id into v_herd;
      update public.animals set herd_id=coalesce(herd_id,v_herd),category_id=coalesce(category_id,v_category),updated_at=now() where id=v_row.animal_id;
    end if;
    if coalesce((v_row.raw_data->>'weight')::numeric,(v_row.raw_data->>'previousWeight')::numeric,(v_row.raw_data->>'adg')::numeric) is not null then
      insert into public.animal_events(animal_id,farm_id,event_type,event_date,source,notes,metadata,import_id,source_key,created_by)
      values(v_row.animal_id,p_farm_id,'pesaje',v_row.event_date,p_provider,v_row.notes,
        jsonb_build_object('weight_kg',v_row.raw_data->'weight','previous_weight_kg',v_row.raw_data->'previousWeight','days',v_row.raw_data->'days','weight_gain_kg',v_row.raw_data->'weightGain','adg_kg_day',v_row.raw_data->'adg','filename',p_filename),
        v_import,v_row.electronic_id||'|'||v_row.event_date::text||'|pesaje',auth.uid()) on conflict(farm_id,source,source_key) do nothing;
    end if;
    if nullif(v_row.raw_data->>'treatment','') is not null then
      v_event:=case when exists(select 1 from jsonb_array_elements_text(coalesce(v_row.raw_data->'detectedEventTypes','[]'::jsonb)) x where x='desparasitacion') then 'desparasitacion' else 'tratamiento' end;
      insert into public.animal_events(animal_id,farm_id,event_type,event_date,source,notes,metadata,import_id,source_key,created_by)
      values(v_row.animal_id,p_farm_id,v_event,v_row.event_date,p_provider,v_row.notes,
        jsonb_build_object('product',v_row.raw_data->'treatment','dose',v_row.raw_data->'dose','dose_unit',v_row.raw_data->'doseUnit','operator',v_row.raw_data->'operator','weight_kg',v_row.raw_data->'weight','filename',p_filename),
        v_import,v_row.electronic_id||'|'||v_row.event_date::text||'|'||v_event,auth.uid()) on conflict(farm_id,source,source_key) do nothing;
    end if;
  end loop;
  return v_result||jsonb_build_object('event_detection',true);
end $$;
