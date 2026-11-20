create table public.professional_invoices (
  id uuid primary key,
  client_id uuid not null references public.clients(id) on delete restrict,
  invoice_number text not null check (char_length(trim(invoice_number)) between 1 and 80),
  invoice_date date not null,
  amount numeric(14,2) check (amount >= 0),
  currency text check (currency ~ '^[A-Z]{3}$'),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.professional_invoice_works (
  work_id uuid primary key references public.professional_works(id) on delete restrict,
  invoice_id uuid not null references public.professional_invoices(id) on delete restrict
);

create index professional_invoice_works_invoice_idx on public.professional_invoice_works(invoice_id);

alter table public.professional_invoices enable row level security;
alter table public.professional_invoice_works enable row level security;

create policy professional_invoices_read on public.professional_invoices for select to authenticated
  using (public.is_super_admin());
create policy professional_invoices_insert on public.professional_invoices for insert to authenticated
  with check (public.is_super_admin() and created_by = auth.uid());

create policy professional_invoice_works_read on public.professional_invoice_works for select to authenticated
  using (exists (select 1 from public.professional_works w where w.id = work_id));
create policy professional_invoice_works_insert on public.professional_invoice_works for insert to authenticated
  with check (exists (
    select 1
    from public.professional_works w
    join public.farms f on f.id = w.farm_id
    join public.professional_invoices i on i.id = invoice_id and i.client_id = f.client_id
    where w.id = work_id and w.invoiced and public.can_manage_farm(w.farm_id)
  ));

create policy professional_works_keep_invoice on public.professional_works
  as restrictive for update to authenticated
  with check (invoiced or not exists (
    select 1 from public.professional_invoice_works iw where iw.work_id = professional_works.id
  ));

revoke all on public.professional_invoices, public.professional_invoice_works from anon, authenticated;
grant select on public.professional_invoices, public.professional_invoice_works to authenticated;
grant insert (id, client_id, invoice_number, invoice_date, amount, currency)
  on public.professional_invoices to authenticated;
grant insert (work_id, invoice_id) on public.professional_invoice_works to authenticated;

create function public.record_professional_invoice(
  p_id uuid, p_client_id uuid, p_number text, p_date date, p_amount numeric, p_currency text,
  p_work_ids uuid[], p_session_ids uuid[]
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  work_ids uuid[];
begin
  if not coalesce(public.is_super_admin(), false) then
    raise exception 'No tenés permiso para registrar facturas.' using errcode = '42501';
  end if;

  -- Sessions without a professional work use their session UUID as the work UUID.
  work_ids := coalesce(p_work_ids, '{}'::uuid[]) || coalesce(p_session_ids, '{}'::uuid[]);

  insert into public.professional_invoices(id, client_id, invoice_number, invoice_date, amount, currency)
  values (p_id, p_client_id, trim(p_number), p_date, p_amount, nullif(upper(trim(p_currency)), ''))
  on conflict (id) do nothing;

  if not found then
    if exists (
      select 1 from public.professional_invoices i
      where i.id = p_id and i.created_by = auth.uid() and i.client_id = p_client_id
        and i.invoice_number = trim(p_number) and i.invoice_date = p_date
        and i.amount is not distinct from p_amount
        and i.currency is not distinct from nullif(upper(trim(p_currency)), '')
        and array(select iw.work_id from public.professional_invoice_works iw
                  where iw.invoice_id = p_id order by iw.work_id)
          = array(select id from unnest(work_ids) as ids(id) order by id)
    ) then return; end if;
    raise exception 'La factura ya se guardó con otros datos. Actualizá la lista.';
  end if;

  perform public.invoice_professional_work_selection(p_client_id, p_work_ids, p_session_ids);

  insert into public.professional_invoice_works(work_id, invoice_id)
  select id, p_id from unnest(work_ids) as ids(id) order by id;
exception when unique_violation then
  raise exception 'Uno de los trabajos ya tiene factura. Actualizá la lista.' using errcode = '23505';
end;
$$;

revoke all on function public.record_professional_invoice(uuid, uuid, text, date, numeric, text, uuid[], uuid[]) from public, anon;
grant execute on function public.record_professional_invoice(uuid, uuid, text, date, numeric, text, uuid[], uuid[]) to authenticated;
