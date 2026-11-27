begin;

create table public.livestock_sale_shortlist (
  farm_id uuid not null references public.farms(id) on delete cascade,
  animal_id uuid not null references public.animals(id) on delete cascade,
  source_session_id uuid references public.livestock_work_sessions(id) on delete set null,
  added_by uuid not null default auth.uid() references public.profiles(id),
  added_at timestamptz not null default now(),
  primary key (farm_id, animal_id)
);

alter table public.livestock_sale_shortlist enable row level security;
revoke all on public.livestock_sale_shortlist from public, anon, authenticated;
grant select, insert, delete on public.livestock_sale_shortlist to authenticated;

create policy sale_shortlist_read on public.livestock_sale_shortlist
  for select to authenticated using (public.can_access_farm(farm_id));

create policy sale_shortlist_add on public.livestock_sale_shortlist
  for insert to authenticated with check (
    public.can_manage_farm(farm_id) and added_by = auth.uid()
    and exists (
      select 1 from public.animals a
      where a.id = animal_id and a.farm_id = livestock_sale_shortlist.farm_id
        and a.active and a.reverted_at is null
    )
    and exists (
      select 1 from public.livestock_work_sessions s
      where s.id = source_session_id and s.farm_id = livestock_sale_shortlist.farm_id
        and s.status = 'confirmada' and lower(s.session_type) = 'tacto'
    )
    and exists (
      select 1
      from public.livestock_import_rows r
      join public.livestock_imports i on i.id = r.import_id
      where r.animal_id = livestock_sale_shortlist.animal_id
        and i.work_session_id = livestock_sale_shortlist.source_session_id
        and i.farm_id = livestock_sale_shortlist.farm_id
        and r.result in ('NUEVO', 'EXISTENTE')
        and i.status not in ('anulada', 'revertida', 'revertido')
    )
  );

create policy sale_shortlist_remove on public.livestock_sale_shortlist
  for delete to authenticated using (public.can_manage_farm(farm_id));

commit;
