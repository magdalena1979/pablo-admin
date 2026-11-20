begin;

alter table public.clients add column address text;
alter table public.farms add column address text;

create table public.farm_renspas (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete restrict,
  number text not null check (length(trim(number)) > 0),
  normalized_number text generated always as (regexp_replace(upper(number), '[^A-Z0-9]', '', 'g')) stored,
  cuig text,
  cv text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, normalized_number),
  check (length(normalized_number) > 0)
);

alter table public.farm_renspas enable row level security;
revoke all on public.farm_renspas from anon;
grant select, insert, update on public.farm_renspas to authenticated;

create policy farm_renspas_read_assigned on public.farm_renspas
for select to authenticated using (public.can_access_farm(farm_id));
create policy farm_renspas_super_insert on public.farm_renspas
for insert to authenticated with check (public.is_super_admin());
create policy farm_renspas_super_update on public.farm_renspas
for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- Reuse existing client/farm policies; never broaden access to client records.
create function public.audit_client_registration_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_farm_id uuid;
begin
  if tg_table_name = 'farms' then
    v_farm_id := new.id;
  elsif tg_table_name = 'farm_renspas' then
    v_farm_id := new.farm_id;
  end if;
  insert into public.audit_logs(actor_id, farm_id, entity_type, entity_id, action, old_data, new_data)
  values (auth.uid(), v_farm_id, tg_table_name, new.id::text, tg_op,
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end, to_jsonb(new));
  return new;
end;
$$;
revoke all on function public.audit_client_registration_change() from public;

-- AFTER INSERT ensures a new farm exists before the audit FK is checked.
-- UPDATE timestamp is handled separately because AFTER triggers cannot alter NEW.
create function public.touch_registration_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.touch_registration_updated_at() from public;

create trigger clients_registration_updated_at before update on public.clients
for each row execute function public.touch_registration_updated_at();
create trigger farms_registration_updated_at before update on public.farms
for each row execute function public.touch_registration_updated_at();
create trigger farm_renspas_updated_at before update on public.farm_renspas
for each row execute function public.touch_registration_updated_at();
create trigger clients_registration_audit after insert or update on public.clients
for each row execute function public.audit_client_registration_change();
create trigger farms_registration_audit after insert or update on public.farms
for each row execute function public.audit_client_registration_change();
create trigger farm_renspas_audit after insert or update on public.farm_renspas
for each row execute function public.audit_client_registration_change();

comment on table public.farm_renspas is 'RENSPA registrations belonging to an establishment; client ownership is inherited through farms.client_id.';
commit;
