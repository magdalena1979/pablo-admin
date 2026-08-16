alter table public.farms add column color text not null default '#2d6aa3' check(color ~ '^#[0-9A-Fa-f]{6}$');
update public.farms set color=case name when 'La Esperanza' then '#2D6AA3' when 'El Ombú' then '#6A8F3D' when 'San Jorge' then '#B06A3C' when 'La Toldería' then '#76558F' else color end;
drop function if exists public.create_farm_with_lots(text,text,text,public.service_mode,text,jsonb);
create function public.create_farm_with_lots(p_client_name text,p_contact_name text,p_farm_name text,p_service_mode public.service_mode,p_locality text,p_color text,p_lots jsonb default '[]'::jsonb)
returns uuid language plpgsql security definer set search_path=''
as $$declare v_client_id uuid;v_farm_id uuid;v_lot jsonb;begin
 if not public.is_super_admin() then raise exception 'No tenés permiso para crear establecimientos' using errcode='42501';end if;
 if p_color!~'^#[0-9A-Fa-f]{6}$' then raise exception 'Color inválido';end if;
 insert into public.clients(legal_name,contact_name)values(trim(p_client_name),nullif(trim(p_contact_name),''))returning id into v_client_id;
 insert into public.farms(client_id,name,service_mode,locality,color)values(v_client_id,trim(p_farm_name),p_service_mode,nullif(trim(p_locality),''),upper(p_color))returning id into v_farm_id;
 insert into public.campaigns(farm_id,name,starts_on,ends_on)values(v_farm_id,'2026/27','2026-06-01','2027-05-31');
 for v_lot in select value from jsonb_array_elements(coalesce(p_lots,'[]'::jsonb))loop if nullif(trim(v_lot->>'name'),'')is not null and coalesce((v_lot->>'hectares')::numeric,0)>0 then insert into public.lots(farm_id,name,hectares,current_use)values(v_farm_id,trim(v_lot->>'name'),(v_lot->>'hectares')::numeric,nullif(trim(v_lot->>'current_use'),''));end if;end loop;
 insert into public.audit_logs(actor_id,farm_id,entity_type,entity_id,action,new_data)values(auth.uid(),v_farm_id,'farm',v_farm_id::text,'Creación de establecimiento',jsonb_build_object('client_id',v_client_id,'name',p_farm_name,'color',p_color));return v_farm_id;end;$$;
revoke all on function public.create_farm_with_lots(text,text,text,public.service_mode,text,text,jsonb) from public;
grant execute on function public.create_farm_with_lots(text,text,text,public.service_mode,text,text,jsonb) to authenticated;
