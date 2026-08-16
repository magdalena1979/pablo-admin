create type public.health_event_type as enum ('vacunacion','tratamiento','diagnostico','desparasitacion','control');
create type public.reproductive_event_type as enum ('servicio','inseminacion','tacto','parto','destete');
create type public.agenda_status as enum ('pendiente','realizado','vencido','cancelado');

create table public.health_events (
  id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id) on delete cascade,
  herd_id uuid references public.herds(id) on delete set null, animal_id uuid references public.animals(id) on delete set null,
  event_type public.health_event_type not null, title text not null, scheduled_on date not null, performed_on date,
  status public.agenda_status not null default 'pendiente', animal_count integer check(animal_count is null or animal_count>0),
  product text, dose text, notes text, created_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create table public.reproductive_events (
  id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id) on delete cascade,
  herd_id uuid references public.herds(id) on delete set null, animal_id uuid references public.animals(id) on delete set null,
  event_type public.reproductive_event_type not null, event_date date not null, status public.agenda_status not null default 'realizado',
  animal_count integer check(animal_count is null or animal_count>0), result text, notes text,
  created_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create index health_events_farm_date_idx on public.health_events(farm_id,scheduled_on);
create index reproductive_events_farm_date_idx on public.reproductive_events(farm_id,event_date desc);
alter table public.health_events enable row level security;
alter table public.reproductive_events enable row level security;
create policy health_read on public.health_events for select to authenticated using(public.can_access_farm(farm_id));
create policy health_manage on public.health_events for all to authenticated using(public.can_manage_farm(farm_id)) with check(public.can_manage_farm(farm_id));
create policy reproduction_read on public.reproductive_events for select to authenticated using(public.can_access_farm(farm_id));
create policy reproduction_manage on public.reproductive_events for all to authenticated using(public.can_manage_farm(farm_id)) with check(public.can_manage_farm(farm_id));
