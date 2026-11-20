begin;

-- Stock of unused ear tags. No animals are created by this workflow.
create table public.ear_tag_receipts (
  id uuid primary key,
  renspa_id uuid not null references public.farm_renspas(id) on delete restrict,
  received_on date not null,
  first_eid text not null check (first_eid ~ '^[0-9]{15}$'),
  last_eid text not null check (last_eid ~ '^[0-9]{15}$'),
  quantity integer not null check (quantity between 1 and 10000),
  request_payload jsonb not null,
  received_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (last_eid::bigint >= first_eid::bigint),
  check (last_eid::bigint - first_eid::bigint + 1 = quantity)
);
create index ear_tag_receipts_renspa_idx on public.ear_tag_receipts(renspa_id);

create table public.ear_tag_ranges (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.ear_tag_receipts(id) on delete restrict,
  first_eid text not null check (first_eid ~ '^[0-9]{15}$'),
  last_eid text not null check (last_eid ~ '^[0-9]{15}$'),
  target_sex text not null check (target_sex in ('macho', 'hembra')),
  quantity integer not null check (quantity between 1 and 10000),
  check (last_eid::bigint - first_eid::bigint + 1 = quantity)
);
create index ear_tag_ranges_receipt_idx on public.ear_tag_ranges(receipt_id);

create table public.ear_tags (
  id uuid primary key default gen_random_uuid(),
  range_id uuid not null references public.ear_tag_ranges(id) on delete restrict,
  electronic_id text not null unique check (electronic_id ~ '^[0-9]{15}$'),
  status text not null default 'disponible' check (status = 'disponible'),
  created_at timestamptz not null default now()
);
create index ear_tags_range_idx on public.ear_tags(range_id);

alter table public.ear_tag_receipts enable row level security;
alter table public.ear_tag_ranges enable row level security;
alter table public.ear_tags enable row level security;
revoke all on public.ear_tag_receipts, public.ear_tag_ranges, public.ear_tags from public, anon, authenticated;
grant select on public.ear_tag_receipts, public.ear_tag_ranges, public.ear_tags to authenticated;

create policy ear_tag_receipts_read on public.ear_tag_receipts for select to authenticated
using (exists (select 1 from public.farm_renspas r where r.id = renspa_id and public.can_access_farm(r.farm_id)));
create policy ear_tag_ranges_read on public.ear_tag_ranges for select to authenticated
using (exists (select 1 from public.ear_tag_receipts receipt where receipt.id = receipt_id));
create policy ear_tags_read on public.ear_tags for select to authenticated
using (exists (select 1 from public.ear_tag_ranges tag_range where tag_range.id = range_id));

create function public.receive_ear_tag_bag(
  p_receipt_id uuid, p_renspa_id uuid, p_received_on date,
  p_first_eid text, p_last_eid text, p_declared_quantity integer,
  p_ranges jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_first text := regexp_replace(p_first_eid, '\s', '', 'g');
  v_last text := regexp_replace(p_last_eid, '\s', '', 'g');
  v_quantity bigint;
  v_expected bigint;
  v_farm_id uuid;
  v_range jsonb;
  v_ranges jsonb;
  v_range_id uuid;
  v_payload jsonb;
  v_existing jsonb;
begin
  if auth.uid() is null or not coalesce(public.is_super_admin(), false) then
    raise exception 'No tenés permiso para recibir caravanas' using errcode = '42501';
  end if;
  if p_receipt_id is null or p_received_on is null then
    raise exception 'Completá la fecha de recepción';
  end if;
  select r.farm_id into v_farm_id from public.farm_renspas r
  join public.farms f on f.id = r.farm_id join public.clients c on c.id = f.client_id
  where r.id = p_renspa_id and f.active and c.active;
  if v_farm_id is null then raise exception 'Seleccioná un cliente, establecimiento y RENSPA vigentes'; end if;
  if v_first is null or v_last is null or v_first !~ '^[0-9]{15}$' or v_last !~ '^[0-9]{15}$' then
    raise exception 'Los EID deben tener 15 dígitos';
  end if;
  v_quantity := v_last::bigint - v_first::bigint + 1;
  if v_quantity < 1 or v_quantity > 10000 then raise exception 'El rango debe contener entre 1 y 10000 caravanas'; end if;
  if p_declared_quantity is null or p_declared_quantity <> v_quantity then
    raise exception 'La cantidad de la bolsa no coincide con el rango';
  end if;
  if p_ranges is null or jsonb_typeof(p_ranges) <> 'array' then raise exception 'Agregá los rangos de destino'; end if;
  if jsonb_array_length(p_ranges) < 1 or jsonb_array_length(p_ranges) > v_quantity then raise exception 'Revisá la cantidad de rangos'; end if;

  -- Validate strings before any cast; then sort and require a complete partition.
  for v_range in select value from jsonb_array_elements(p_ranges) loop
    if coalesce(regexp_replace(v_range->>'first', '\s', '', 'g'), '') !~ '^[0-9]{15}$'
      or coalesce(regexp_replace(v_range->>'last', '\s', '', 'g'), '') !~ '^[0-9]{15}$'
      or coalesce(v_range->>'sex', '') not in ('macho', 'hembra') then
      raise exception 'Cada rango requiere EID inicial, final y destino macho o hembra';
    end if;
  end loop;
  select jsonb_agg(jsonb_build_object(
    'first', regexp_replace(value->>'first', '\s', '', 'g'),
    'last', regexp_replace(value->>'last', '\s', '', 'g'), 'sex', value->>'sex')
    order by regexp_replace(value->>'first', '\s', '', 'g')) into v_ranges
  from jsonb_array_elements(p_ranges);
  v_expected := v_first::bigint;
  for v_range in select value from jsonb_array_elements(v_ranges) loop
    if (v_range->>'first')::bigint <> v_expected
      or (v_range->>'last')::bigint < (v_range->>'first')::bigint
      or (v_range->>'last')::bigint > v_last::bigint then
      raise exception 'Los rangos deben cubrir toda la bolsa, sin huecos ni superposiciones';
    end if;
    v_expected := (v_range->>'last')::bigint + 1;
  end loop;
  if v_expected <> v_last::bigint + 1 then raise exception 'Quedan caravanas sin destino'; end if;

  v_payload := jsonb_build_object('renspa_id', p_renspa_id, 'received_on', p_received_on,
    'first', v_first, 'last', v_last, 'quantity', v_quantity, 'ranges', v_ranges);
  -- Retrying an identical request after a lost response must not create another bag.
  perform pg_advisory_xact_lock(hashtextextended(p_receipt_id::text, 0));
  select request_payload into v_existing from public.ear_tag_receipts where id = p_receipt_id;
  if found then
    if v_existing = v_payload then return p_receipt_id; end if;
    raise exception 'La recepción ya existe con otros datos. Cerrá el formulario y revisá el listado';
  end if;

  insert into public.ear_tag_receipts(id, renspa_id, received_on, first_eid, last_eid, quantity, request_payload, received_by)
  values (p_receipt_id, p_renspa_id, p_received_on, v_first, v_last, v_quantity, v_payload, auth.uid());
  for v_range in select value from jsonb_array_elements(v_ranges) loop
    insert into public.ear_tag_ranges(receipt_id, first_eid, last_eid, target_sex, quantity)
    values (p_receipt_id, v_range->>'first', v_range->>'last', v_range->>'sex',
      (v_range->>'last')::bigint - (v_range->>'first')::bigint + 1) returning id into v_range_id;
    insert into public.ear_tags(range_id, electronic_id)
    select v_range_id, lpad(n::text, 15, '0')
    from generate_series((v_range->>'first')::bigint, (v_range->>'last')::bigint) as n;
  end loop;
  insert into public.audit_logs(actor_id, farm_id, entity_type, entity_id, action, new_data)
  values (auth.uid(), v_farm_id, 'ear_tag_receipt', p_receipt_id::text, 'Recepción de caravanas disponibles', v_payload);
  return p_receipt_id;
exception when unique_violation then
  raise exception 'Hay caravanas de este rango que ya fueron recibidas. No se guardó la bolsa' using errcode = '23505';
end;
$$;
revoke all on function public.receive_ear_tag_bag(uuid,uuid,date,text,text,integer,jsonb) from public, anon;
grant execute on function public.receive_ear_tag_bag(uuid,uuid,date,text,text,integer,jsonb) to authenticated;
comment on table public.ear_tags is 'Unused electronic ear tags. Reception does not create or identify animals. Destination sex is inherited from ear_tag_ranges.';
commit;
