create or replace function public.set_global_category_valuation(p_category_id uuid,p_date date,p_price numeric)
returns void language plpgsql security definer set search_path=''as $$
declare v_farm record;v_campaign uuid;
begin
 if not public.is_super_admin()then raise exception 'Solo el super administrador puede definir valuaciones'using errcode='42501';end if;
 if p_price<=0 then raise exception 'El precio debe ser mayor a cero';end if;
 for v_farm in select id from public.farms where active loop
  select id into v_campaign from public.campaigns where farm_id=v_farm.id and p_date between starts_on and ends_on order by starts_on desc limit 1;
  if v_campaign is not null then
   insert into public.category_valuations(farm_id,campaign_id,category_id,valuation_date,price_per_kg_ars,created_by)
   values(v_farm.id,v_campaign,p_category_id,p_date,p_price,auth.uid())
   on conflict(farm_id,campaign_id,category_id,valuation_date)do update set price_per_kg_ars=excluded.price_per_kg_ars,created_by=excluded.created_by;
  end if;
 end loop;
end;$$;
grant execute on function public.set_global_category_valuation(uuid,date,numeric)to authenticated;
