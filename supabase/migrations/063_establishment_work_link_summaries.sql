begin;

create or replace function public.summarize_establishment_work_links(
  p_farm_id uuid,
  p_session_ids uuid[]
)
returns table (session_id uuid, animals integer, renspa_ids uuid[])
language sql stable security invoker
set search_path = ''
as $$
  select l.session_id,
    count(distinct l.animal_id)::integer,
    coalesce(array_agg(distinct e.renspa_id) filter (where e.renspa_id is not null), '{}'::uuid[])
  from public.livestock_work_sessions s
  join public.ear_tag_session_links l on l.session_id = s.id
  left join public.ear_tags t on t.id = l.tag_id
  left join public.ear_tag_ranges r on r.id = t.range_id
  left join public.ear_tag_receipts e on e.id = r.receipt_id
  where s.farm_id = p_farm_id
    and public.can_access_farm(p_farm_id)
    and cardinality(p_session_ids) between 1 and 20
    and s.id = any(p_session_ids)
  group by l.session_id;
$$;

revoke all on function public.summarize_establishment_work_links(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.summarize_establishment_work_links(uuid, uuid[]) to authenticated;

commit;
