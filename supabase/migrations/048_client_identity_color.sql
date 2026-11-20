begin;
alter table public.clients add column if not exists color text not null default '#2D6AA3';
do $$ begin
 if not exists(select 1 from pg_constraint where conname='clients_color_hex_check' and conrelid='public.clients'::regclass) then
  alter table public.clients add constraint clients_color_hex_check check(color ~ '^#[0-9A-Fa-f]{6}$');
 end if;
end $$;
notify pgrst,'reload schema';
commit;
