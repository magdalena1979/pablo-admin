create type public.livestock_operation as enum (
  'nacimiento', 'compra', 'venta', 'muerte', 'traslado', 'cambio_categoria', 'ajuste'
);
create type public.record_status as enum ('borrador', 'confirmado', 'anulado');

create table public.livestock_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true
);

create table public.herds (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  lot_id uuid references public.lots(id) on delete set null,
  category_id uuid references public.livestock_categories(id) on delete restrict,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (farm_id, name)
);

create table public.animals (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  herd_id uuid references public.herds(id) on delete set null,
  lot_id uuid references public.lots(id) on delete set null,
  category_id uuid references public.livestock_categories(id) on delete restrict,
  tag_number text not null,
  sex text check (sex in ('macho', 'hembra')),
  birth_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (farm_id, tag_number)
);

create table public.livestock_movements (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete restrict,
  operation public.livestock_operation not null,
  status public.record_status not null default 'borrador',
  occurred_on date not null,
  animal_count integer not null check (animal_count > 0),
  total_weight_kg numeric(14,3) check (total_weight_kg is null or total_weight_kg >= 0),
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  confirmed_by uuid references public.profiles(id) on delete restrict,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create index herds_farm_lot_idx on public.herds(farm_id, lot_id);
create index animals_farm_active_idx on public.animals(farm_id, active);
create index movements_farm_date_idx on public.livestock_movements(farm_id, occurred_on desc);

alter table public.livestock_categories enable row level security;
alter table public.herds enable row level security;
alter table public.animals enable row level security;
alter table public.livestock_movements enable row level security;

create policy categories_authenticated_read on public.livestock_categories for select to authenticated using (true);
create policy categories_super_manage on public.livestock_categories for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
create policy herds_farm_read on public.herds for select to authenticated using (public.can_access_farm(farm_id));
create policy herds_farm_manage on public.herds for all to authenticated using (public.can_manage_farm(farm_id)) with check (public.can_manage_farm(farm_id));
create policy animals_farm_read on public.animals for select to authenticated using (public.can_access_farm(farm_id));
create policy animals_farm_manage on public.animals for all to authenticated using (public.can_manage_farm(farm_id)) with check (public.can_manage_farm(farm_id));
create policy movements_farm_read on public.livestock_movements for select to authenticated using (public.can_access_farm(farm_id));
create policy movements_create_draft on public.livestock_movements for insert to authenticated
with check (public.can_manage_farm(farm_id) and status = 'borrador' and created_by = auth.uid());
create policy movements_super_update on public.livestock_movements for update to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());

insert into public.livestock_categories (name) values
  ('Vaca'), ('Vaquillona'), ('Ternero'), ('Ternera'), ('Novillo'), ('Novillito'), ('Toro')
on conflict (name) do nothing;
