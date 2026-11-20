create table public.professional_works (
  id uuid primary key,
  farm_id uuid not null references public.farms(id) on delete restrict,
  work_date date not null,
  description text not null check (char_length(trim(description)) between 1 and 200),
  invoiced boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create index professional_works_date_idx on public.professional_works(work_date desc, id);

create table public.professional_work_sessions (
  session_id uuid primary key references public.livestock_work_sessions(id) on delete restrict,
  work_id uuid not null references public.professional_works(id) on delete restrict
);

create index professional_work_sessions_work_idx on public.professional_work_sessions(work_id);

alter table public.professional_works enable row level security;
alter table public.professional_work_sessions enable row level security;

create policy professional_works_read on public.professional_works for select to authenticated
  using (public.is_super_admin() and public.can_access_farm(farm_id));
create policy professional_works_insert on public.professional_works for insert to authenticated
  with check (public.is_super_admin() and public.can_manage_farm(farm_id) and created_by = auth.uid());
create policy professional_works_invoice on public.professional_works for update to authenticated
  using (public.is_super_admin() and public.can_manage_farm(farm_id))
  with check (public.is_super_admin() and public.can_manage_farm(farm_id));

create policy professional_work_sessions_read on public.professional_work_sessions for select to authenticated
  using (exists (select 1 from public.professional_works w where w.id = work_id));
create policy professional_work_sessions_insert on public.professional_work_sessions for insert to authenticated
  with check (exists (
    select 1 from public.professional_works w
    join public.livestock_work_sessions s on s.farm_id = w.farm_id
    where w.id = work_id and s.id = session_id
      and s.source = 'gallagher' and s.status = 'confirmada'
      and public.can_manage_farm(w.farm_id)
  ));

revoke all on public.professional_works, public.professional_work_sessions from anon, authenticated;
grant select on public.professional_works, public.professional_work_sessions to authenticated;
grant insert (id, farm_id, work_date, description), update (invoiced)
  on public.professional_works to authenticated;
grant insert (work_id, session_id) on public.professional_work_sessions to authenticated;

create function public.create_professional_work(
  p_id uuid, p_farm_id uuid, p_work_date date, p_description text, p_session_ids uuid[]
)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.professional_works(id, farm_id, work_date, description)
  values (p_id, p_farm_id, p_work_date, trim(p_description))
  on conflict (id) do nothing;
  if not found then
    if exists (
      select 1 from public.professional_works as w
      where w.id = p_id and w.created_by = auth.uid() and w.farm_id = p_farm_id
        and w.work_date = p_work_date and w.description = trim(p_description)
        and array(select link.session_id from public.professional_work_sessions link
                  where link.work_id = p_id order by link.session_id)
          = array(select id from unnest(p_session_ids) as ids(id) order by id)
    ) then return; end if;
    raise exception 'El identificador ya corresponde a otro registro.';
  end if;

  insert into public.professional_work_sessions(work_id, session_id)
  select p_id, id from unnest(p_session_ids) as ids(id);
exception when unique_violation then
  raise exception 'Una de las sesiones ya está vinculada a otro trabajo.' using errcode = '23505';
end;
$$;

revoke all on function public.create_professional_work(uuid, uuid, date, text, uuid[]) from public, anon;
grant execute on function public.create_professional_work(uuid, uuid, date, text, uuid[]) to authenticated;
