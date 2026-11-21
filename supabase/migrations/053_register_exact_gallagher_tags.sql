begin;

alter table public.ear_tag_receipts add column gallagher_origin jsonb;
create index ear_tag_receipts_gallagher_group_idx
  on public.ear_tag_receipts ((gallagher_origin->>'group_id')) where gallagher_origin is not null;

create function public.register_gallagher_tags(
  p_group_id uuid, p_renspa_id uuid, p_sex text, p_eids text[],
  p_file_hash text, p_filename text
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_eids text[];
  v_signature text;
  v_saved_signature text;
  v_receipt uuid;
  v_farm_id uuid;
  v_date date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_run record;
begin
  if auth.uid() is null or not coalesce(public.is_super_admin(), false) then
    raise exception 'No tenés permiso para registrar caravanas.' using errcode = '42501';
  end if;
  if p_group_id is null or p_sex is null or p_sex not in ('macho', 'hembra')
    or coalesce(cardinality(p_eids), 0) not between 1 and 10000
    or coalesce(p_file_hash, '') !~ '^[0-9a-f]{64}$'
    or coalesce(char_length(trim(p_filename)), 0) not between 1 and 255 then
    raise exception 'Revisá el archivo, la cantidad y el destino de las caravanas.';
  end if;
  if exists (select 1 from unnest(p_eids) as x(eid) where coalesce(eid, '') !~ '^[0-9]{15}$') then
    raise exception 'Cada EID tiene que tener 15 dígitos.';
  end if;
  select array_agg(distinct eid order by eid) into v_eids from unnest(p_eids) as x(eid);
  if cardinality(v_eids) <> cardinality(p_eids) then raise exception 'Hay EID repetidos en la selección.'; end if;
  select r.farm_id into v_farm_id from public.farm_renspas r
  join public.farms f on f.id = r.farm_id join public.clients c on c.id = f.client_id
  where r.id = p_renspa_id and f.active and c.active;
  if v_farm_id is null then raise exception 'Seleccioná un establecimiento y un RENSPA vigentes.'; end if;

  v_signature := md5(jsonb_build_array(auth.uid(), p_renspa_id, p_sex, v_eids, p_file_hash, p_filename)::text);
  perform pg_advisory_xact_lock(hashtextextended(p_group_id::text, 1));
  select gallagher_origin->>'signature' into v_saved_signature from public.ear_tag_receipts
  where gallagher_origin is not null and gallagher_origin->>'group_id' = p_group_id::text limit 1;
  if found then
    if v_saved_signature = v_signature then return; end if;
    raise exception 'Este grupo ya se registró con otra selección. Volvé a revisar el CSV.';
  end if;
  if exists (select 1 from public.ear_tags t where t.electronic_id = any(v_eids)) then
    raise exception 'Alguna caravana ya está registrada. Volvé a revisar el CSV.' using errcode = '23505';
  end if;
  if exists (select 1 from public.animals a where a.electronic_id = any(v_eids)
    and (a.farm_id is distinct from v_farm_id or (a.sex is not null and a.sex <> p_sex))) then
    raise exception 'Un EID ya pertenece a un animal con otro establecimiento o sexo.';
  end if;

  -- Existing stock uses closed ranges. Partition only the selected EIDs into consecutive runs.
  for v_run in
    select min(eid) as first_eid, max(eid) as last_eid, count(*)::integer as quantity
    from (select eid, eid::bigint - row_number() over (order by eid) as run from unnest(v_eids) x(eid)) numbered
    group by run order by min(eid)
  loop
    v_receipt := md5(p_group_id::text || ':' || v_run.first_eid)::uuid;
    perform public.receive_ear_tag_bag(v_receipt, p_renspa_id, v_date,
      v_run.first_eid, v_run.last_eid, v_run.quantity,
      jsonb_build_array(jsonb_build_object('first', v_run.first_eid, 'last', v_run.last_eid, 'sex', p_sex)));
    update public.ear_tag_receipts set gallagher_origin = jsonb_build_object(
      'group_id', p_group_id, 'file_hash', p_file_hash, 'filename', p_filename, 'signature', v_signature)
    where id = v_receipt;
  end loop;
end;
$$;

revoke all on function public.register_gallagher_tags(uuid, uuid, text, text[], text, text) from public, anon;
grant execute on function public.register_gallagher_tags(uuid, uuid, text, text[], text, text) to authenticated;
notify pgrst, 'reload schema';
commit;
