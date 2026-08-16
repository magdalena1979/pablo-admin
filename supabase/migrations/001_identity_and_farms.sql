create extension if not exists pgcrypto;

create type public.app_role as enum ('super_admin', 'administrativo', 'empleado_campo');
create type public.service_mode as enum ('veterinaria', 'administracion_integral');
create type public.farm_permission as enum ('consulta', 'operacion', 'administracion');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role public.app_role not null default 'empleado_campo',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  tax_id text,
  contact_name text,
  phone text,
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.farms (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  name text not null,
  service_mode public.service_mode not null,
  locality text,
  province text not null default 'Buenos Aires',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, name)
);

create table public.farm_user_assignments (
  farm_id uuid not null references public.farms(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  permission public.farm_permission not null default 'consulta',
  created_at timestamptz not null default now(),
  primary key (farm_id, profile_id)
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_on > starts_on),
  unique (farm_id, name)
);

create table public.lots (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null,
  hectares numeric(12,2) not null check (hectares > 0),
  current_use text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, name)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  farm_id uuid references public.farms(id) on delete set null,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index farms_client_idx on public.farms(client_id);
create index farm_assignments_profile_idx on public.farm_user_assignments(profile_id);
create index lots_farm_idx on public.lots(farm_id);
create index campaigns_farm_dates_idx on public.campaigns(farm_id, starts_on, ends_on);
create index audit_logs_farm_created_idx on public.audit_logs(farm_id, created_at desc);

create or replace function public.is_super_admin()
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin' and active
  );
$$;

create or replace function public.can_access_farm(target_farm_id uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select public.is_super_admin() or exists (
    select 1
    from public.farm_user_assignments a
    join public.profiles p on p.id = a.profile_id
    where a.farm_id = target_farm_id and a.profile_id = auth.uid() and p.active
  );
$$;

create or replace function public.can_manage_farm(target_farm_id uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select public.is_super_admin() or exists (
    select 1
    from public.farm_user_assignments a
    join public.profiles p on p.id = a.profile_id
    where a.farm_id = target_farm_id and a.profile_id = auth.uid()
      and a.permission in ('operacion', 'administracion') and p.active
  );
$$;

revoke all on function public.is_super_admin() from public;
revoke all on function public.can_access_farm(uuid) from public;
revoke all on function public.can_manage_farm(uuid) from public;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.can_access_farm(uuid) to authenticated;
grant execute on function public.can_manage_farm(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.farms enable row level security;
alter table public.farm_user_assignments enable row level security;
alter table public.campaigns enable row level security;
alter table public.lots enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_read_self_or_super on public.profiles for select to authenticated
using (id = auth.uid() or public.is_super_admin());
create policy profiles_super_manage on public.profiles for all to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());

create policy clients_read_assigned on public.clients for select to authenticated
using (public.is_super_admin() or exists (
  select 1 from public.farms f where f.client_id = clients.id and public.can_access_farm(f.id)
));
create policy clients_super_manage on public.clients for all to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());

create policy farms_read_assigned on public.farms for select to authenticated
using (public.can_access_farm(id));
create policy farms_super_manage on public.farms for all to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());

create policy assignments_read_own_or_super on public.farm_user_assignments for select to authenticated
using (profile_id = auth.uid() or public.is_super_admin());
create policy assignments_super_manage on public.farm_user_assignments for all to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());

create policy campaigns_read_assigned on public.campaigns for select to authenticated
using (public.can_access_farm(farm_id));
create policy campaigns_manage_assigned on public.campaigns for all to authenticated
using (public.can_manage_farm(farm_id)) with check (public.can_manage_farm(farm_id));
create policy lots_read_assigned on public.lots for select to authenticated
using (public.can_access_farm(farm_id));
create policy lots_manage_assigned on public.lots for all to authenticated
using (public.can_manage_farm(farm_id)) with check (public.can_manage_farm(farm_id));

create policy audit_read_super on public.audit_logs for select to authenticated
using (public.is_super_admin());

comment on table public.audit_logs is 'Append-only audit trail. Inserts are performed by trusted database functions and triggers.';
