begin;

create index if not exists livestock_import_rows_import_health_idx
  on public.livestock_import_rows (import_id, id)
  where animal_id is not null and result in ('NUEVO', 'EXISTENTE');

create or replace function public.list_gallagher_health_page(
  p_farm_id uuid,
  p_renspa_id uuid,
  p_type text,
  p_import_id uuid,
  p_date text,
  p_offset integer
)
returns jsonb
language sql stable security invoker
set search_path = ''
as $$
  with matching as materialized (
    select r.id, r.import_id, i.filename,
      left(coalesce(nullif(r.raw_data->>'sourceDate', ''), to_char(r.event_date at time zone 'UTC', 'YYYY-MM-DD'), ''), 10) as date,
      coalesce(nullif(r.raw_data->>'tagNumber', ''), r.tag_number, '') as tag,
      mark.original
    from public.livestock_imports i
    join public.livestock_import_rows r on r.import_id = i.id
    cross join lateral (
      select trim(f.value) as original
      from jsonb_each_text(case when jsonb_typeof(r.raw_data->'rawCsv') = 'object'
        then r.raw_data->'rawCsv' else '{}'::jsonb end) f
      where (p_type = 'sangrado' and lower(trim(f.key)) in ('sangrado.bruceliosis', 'sangrado.bruceiosis')
        and lower(trim(f.value)) = 'yes')
        or (p_type = 'atosa' and lower(trim(f.key)) = 'atosa.clost.repro.co' and trim(f.value) <> '')
      order by f.key
      limit 1
    ) mark
    where i.farm_id = p_farm_id and i.provider = 'gallagher'
      and i.status not in ('anulada', 'revertida', 'revertido')
      and r.animal_id is not null and r.result in ('NUEVO', 'EXISTENTE')
      and (p_renspa_id is null or r.raw_data->>'renspaId' = p_renspa_id::text)
  ), scope as materialized (
    select * from matching
    where p_import_id is null or (import_id = p_import_id and date = p_date)
  ), source_list as (
    select distinct import_id, date, filename from matching
  ), page_rows as (
    select * from scope
    order by date desc, length(ltrim(tag, '0')), ltrim(tag, '0'), tag, id
    limit 20 offset greatest(coalesce(p_offset, 0), 0)
  )
  select jsonb_build_object(
    'total', (select count(*) from scope),
    'sources', coalesce((select jsonb_agg(jsonb_build_object(
      'importId', import_id, 'date', date, 'filename', filename
    ) order by date desc, filename, import_id) from source_list), '[]'::jsonb),
    'rows', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'type', p_type, 'importId', import_id, 'date', date,
      'tag', tag, 'filename', filename, 'original', original
    ) order by date desc, length(ltrim(tag, '0')), ltrim(tag, '0'), tag, id) from page_rows), '[]'::jsonb)
  );
$$;

revoke all on function public.list_gallagher_health_page(uuid, uuid, text, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.list_gallagher_health_page(uuid, uuid, text, uuid, text, integer) to authenticated;

commit;
