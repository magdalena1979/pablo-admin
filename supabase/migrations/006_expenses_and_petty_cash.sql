create type public.expense_status as enum ('pendiente','aprobado','observado','anulado');
create type public.money_currency as enum ('ARS','USD');
create type public.expense_source as enum ('administracion','caja_chica');

create table public.suppliers (
  id uuid primary key default gen_random_uuid(), name text not null, tax_id text, category text,
  phone text, email text, active boolean not null default true, created_at timestamptz not null default now()
);
create table public.expenses (
  id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id) on delete cascade,
  lot_id uuid references public.lots(id) on delete set null, supplier_id uuid references public.suppliers(id) on delete set null,
  expense_date date not null, category text not null, concept text not null, currency public.money_currency not null default 'ARS',
  amount numeric(16,2) not null check(amount>0), source public.expense_source not null default 'administracion',
  status public.expense_status not null default 'pendiente', receipt_number text, notes text,
  created_by uuid not null references public.profiles(id), reviewed_by uuid references public.profiles(id), reviewed_at timestamptz,
  review_notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index expenses_farm_date_idx on public.expenses(farm_id,expense_date desc);
create index expenses_status_idx on public.expenses(status) where status='pendiente';
alter table public.suppliers enable row level security;
alter table public.expenses enable row level security;
create policy suppliers_read on public.suppliers for select to authenticated using(true);
create policy suppliers_super_manage on public.suppliers for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
create policy expenses_read on public.expenses for select to authenticated using(public.can_access_farm(farm_id));
create policy expenses_create on public.expenses for insert to authenticated with check(public.can_manage_farm(farm_id) and created_by=auth.uid() and status='pendiente');
create policy expenses_super_update on public.expenses for update to authenticated using(public.is_super_admin()) with check(public.is_super_admin());

create or replace function public.review_expense(p_expense_id uuid,p_status public.expense_status,p_notes text default null)
returns void language plpgsql security definer set search_path=''
as $$
declare v_old public.expenses;
begin
  if not public.is_super_admin() then raise exception 'Solo Pablo puede revisar gastos' using errcode='42501'; end if;
  if p_status not in ('aprobado','observado','anulado') then raise exception 'Estado de revisión inválido'; end if;
  select * into v_old from public.expenses where id=p_expense_id for update;
  if not found then raise exception 'Gasto inexistente'; end if;
  update public.expenses set status=p_status,reviewed_by=auth.uid(),reviewed_at=now(),review_notes=nullif(trim(p_notes),''),updated_at=now() where id=p_expense_id;
  insert into public.audit_logs(actor_id,farm_id,entity_type,entity_id,action,old_data,new_data)
  values(auth.uid(),v_old.farm_id,'expense',p_expense_id::text,'Revisión de gasto',to_jsonb(v_old),jsonb_build_object('status',p_status,'notes',p_notes));
end;$$;
revoke all on function public.review_expense(uuid,public.expense_status,text) from public;
grant execute on function public.review_expense(uuid,public.expense_status,text) to authenticated;
