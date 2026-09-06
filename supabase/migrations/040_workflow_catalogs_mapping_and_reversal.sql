-- Flujo v2: catálogos estables, procedencia por importación y reversión selectiva.
create or replace function public.livestock_catalog_code(value text) returns text
language sql immutable strict as $$
 select trim(both '_' from regexp_replace(translate(lower(trim(value)),'áéíóúüñ','aeiouun'),'[^a-z0-9]+','_','g'));
$$;

create table if not exists public.livestock_session_type_catalog(
 id uuid primary key default gen_random_uuid(),code text,name text not null unique,active boolean not null default true,
 description text,created_by uuid not null references public.profiles(id),created_at timestamptz not null default now()
);
alter table public.livestock_session_type_catalog add column if not exists code text;
update public.livestock_session_type_catalog set code=public.livestock_catalog_code(name) where code is null;
alter table public.livestock_session_type_catalog alter column code set not null;
create unique index if not exists livestock_session_type_catalog_code_uidx on public.livestock_session_type_catalog(code);

create table if not exists public.livestock_action_type_catalog(
 id uuid primary key default gen_random_uuid(),code text,name text not null unique,event_type text not null,
 health_action boolean not null default false,supports_general_dose boolean not null default false,
 supports_individual_dose boolean not null default false,active boolean not null default true,
 description text,created_by uuid not null references public.profiles(id),created_at timestamptz not null default now()
);
alter table public.livestock_action_type_catalog add column if not exists code text;
update public.livestock_action_type_catalog set code=public.livestock_catalog_code(event_type) where code is null;
alter table public.livestock_action_type_catalog alter column code set not null;
create unique index if not exists livestock_action_type_catalog_code_uidx on public.livestock_action_type_catalog(code);
create unique index if not exists livestock_action_type_catalog_event_uidx on public.livestock_action_type_catalog(event_type);

create table if not exists public.livestock_import_mapping_templates(
 id uuid primary key default gen_random_uuid(),provider text not null,name text not null,header_signature text not null,
 mapping jsonb not null,headers jsonb not null default '[]'::jsonb,active boolean not null default true,
 created_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(provider,name),unique(provider,header_signature)
);

alter table public.livestock_imports
 add column if not exists content_hash text,
 add column if not exists detected_headers jsonb not null default '[]'::jsonb,
 add column if not exists applied_mapping jsonb not null default '{}'::jsonb,
 add column if not exists ignored_headers jsonb not null default '[]'::jsonb,
 add column if not exists draft_group_decisions jsonb not null default '{}'::jsonb,
 add column if not exists mapping_template_id uuid references public.livestock_import_mapping_templates(id) on delete set null,
 add column if not exists session_mode text,
 add column if not exists annulled_at timestamptz,
 add column if not exists annulled_by uuid references public.profiles(id),
 add column if not exists reversed_at timestamptz,
 add column if not exists reversed_by uuid references public.profiles(id);
update public.livestock_imports set content_hash=file_hash where content_hash is null;
alter table public.animals
 add column if not exists reverted_at timestamptz,
 add column if not exists reverted_by uuid references public.profiles(id),
 add column if not exists reverted_from_import_id uuid references public.livestock_imports(id) on delete set null,
 add column if not exists reversal_reason text;
alter table public.animal_events
 add column if not exists voided_at timestamptz,
 add column if not exists voided_by uuid references public.profiles(id),
 add column if not exists voided_from_import_id uuid references public.livestock_imports(id) on delete set null,
 add column if not exists void_reason text;
create index if not exists animals_operational_idx on public.animals(farm_id,active) where reverted_at is null;
create index if not exists animal_events_operational_idx on public.animal_events(animal_id,event_date desc) where voided_at is null;
do $$ begin
 if exists(select 1 from pg_constraint where conname='animal_events_farm_id_source_source_key_key' and conrelid='public.animal_events'::regclass) then
  alter table public.animal_events drop constraint animal_events_farm_id_source_source_key_key;
 end if;
end $$;
create unique index if not exists animal_events_active_source_uidx on public.animal_events(farm_id,source,source_key) where voided_at is null;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='livestock_imports_session_mode_check' and conrelid='public.livestock_imports'::regclass) then
  alter table public.livestock_imports add constraint livestock_imports_session_mode_check check(session_mode is null or session_mode in('new','existing','none'));
 end if;
end $$;

alter table public.livestock_work_sessions
 add column if not exists type_id uuid references public.livestock_session_type_catalog(id) on delete set null,
 add column if not exists created_from_import_id uuid references public.livestock_imports(id) on delete set null,
 add column if not exists confirmed_by uuid references public.profiles(id),
 add column if not exists confirmed_at timestamptz,
 add column if not exists updated_at timestamptz not null default now();
create unique index if not exists livestock_work_sessions_created_import_uidx on public.livestock_work_sessions(created_from_import_id) where created_from_import_id is not null;

alter table public.livestock_work_session_actions
 add column if not exists action_type_id uuid references public.livestock_action_type_catalog(id) on delete set null,
 add column if not exists created_from_import_id uuid references public.livestock_imports(id) on delete set null,
 add column if not exists product text,add column if not exists general_dose numeric,
 add column if not exists dose_unit text,add column if not exists responsible text,add column if not exists notes text;
alter table public.livestock_work_session_animals
 add column if not exists created_from_import_id uuid references public.livestock_imports(id) on delete set null;

create table if not exists public.livestock_work_session_action_animals(
 action_id uuid not null references public.livestock_work_session_actions(id) on delete cascade,
 animal_id uuid not null references public.animals(id) on delete cascade,individual_dose numeric,dose_unit text,
 created_from_import_id uuid references public.livestock_imports(id) on delete set null,
 metadata jsonb not null default '{}'::jsonb,primary key(action_id,animal_id)
);
alter table public.livestock_work_session_action_animals add column if not exists created_from_import_id uuid references public.livestock_imports(id) on delete set null;

create table if not exists public.livestock_work_session_animal_imports(
 session_id uuid not null,animal_id uuid not null,import_id uuid not null references public.livestock_imports(id) on delete cascade,
 created_at timestamptz not null default now(),primary key(session_id,animal_id,import_id),
 foreign key(session_id,animal_id) references public.livestock_work_session_animals(session_id,animal_id) on delete cascade
);
create table if not exists public.livestock_work_session_action_imports(
 action_id uuid not null references public.livestock_work_session_actions(id) on delete cascade,
 import_id uuid not null references public.livestock_imports(id) on delete cascade,created_at timestamptz not null default now(),primary key(action_id,import_id)
);
create table if not exists public.livestock_work_session_action_animal_imports(
 action_id uuid not null,animal_id uuid not null,import_id uuid not null references public.livestock_imports(id) on delete cascade,
 created_at timestamptz not null default now(),primary key(action_id,animal_id,import_id),
 foreign key(action_id,animal_id) references public.livestock_work_session_action_animals(action_id,animal_id) on delete cascade
);
create table if not exists public.livestock_import_audit_logs(
 id uuid primary key default gen_random_uuid(),import_id uuid not null references public.livestock_imports(id) on delete cascade,
 action text not null,detail jsonb not null default '{}'::jsonb,performed_by uuid not null references public.profiles(id),performed_at timestamptz not null default now()
);

alter table public.livestock_session_type_catalog enable row level security;
alter table public.livestock_action_type_catalog enable row level security;
alter table public.livestock_import_mapping_templates enable row level security;
alter table public.livestock_work_session_action_animals enable row level security;
alter table public.livestock_work_session_animal_imports enable row level security;
alter table public.livestock_work_session_action_imports enable row level security;
alter table public.livestock_work_session_action_animal_imports enable row level security;
alter table public.livestock_import_audit_logs enable row level security;

drop policy if exists session_catalog_read on public.livestock_session_type_catalog;
drop policy if exists session_catalog_manage on public.livestock_session_type_catalog;
create policy session_catalog_read on public.livestock_session_type_catalog for select to authenticated using(true);
create policy session_catalog_manage on public.livestock_session_type_catalog for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin() and created_by=auth.uid());
drop policy if exists action_catalog_read on public.livestock_action_type_catalog;
drop policy if exists action_catalog_manage on public.livestock_action_type_catalog;
create policy action_catalog_read on public.livestock_action_type_catalog for select to authenticated using(true);
create policy action_catalog_manage on public.livestock_action_type_catalog for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin() and created_by=auth.uid());
drop policy if exists mapping_templates_read on public.livestock_import_mapping_templates;
drop policy if exists mapping_templates_manage on public.livestock_import_mapping_templates;
create policy mapping_templates_read on public.livestock_import_mapping_templates for select to authenticated using(true);
create policy mapping_templates_manage on public.livestock_import_mapping_templates for all to authenticated using(created_by=auth.uid() or public.is_super_admin()) with check(created_by=auth.uid());
drop policy if exists session_action_animals_access on public.livestock_work_session_action_animals;
create policy session_action_animals_access on public.livestock_work_session_action_animals for all to authenticated
 using(exists(select 1 from public.livestock_work_session_actions a join public.livestock_work_sessions s on s.id=a.session_id where a.id=action_id and public.can_access_farm(s.farm_id)))
 with check(exists(select 1 from public.livestock_work_session_actions a join public.livestock_work_sessions s on s.id=a.session_id where a.id=action_id and public.can_manage_farm(s.farm_id)));
drop policy if exists session_animal_imports_access on public.livestock_work_session_animal_imports;
create policy session_animal_imports_access on public.livestock_work_session_animal_imports for all to authenticated
 using(exists(select 1 from public.livestock_work_sessions s where s.id=session_id and public.can_access_farm(s.farm_id)))
 with check(exists(select 1 from public.livestock_work_sessions s where s.id=session_id and public.can_manage_farm(s.farm_id)));
drop policy if exists session_action_imports_access on public.livestock_work_session_action_imports;
create policy session_action_imports_access on public.livestock_work_session_action_imports for all to authenticated
 using(exists(select 1 from public.livestock_work_session_actions a join public.livestock_work_sessions s on s.id=a.session_id where a.id=action_id and public.can_access_farm(s.farm_id)))
 with check(exists(select 1 from public.livestock_work_session_actions a join public.livestock_work_sessions s on s.id=a.session_id where a.id=action_id and public.can_manage_farm(s.farm_id)));
drop policy if exists session_action_animal_imports_access on public.livestock_work_session_action_animal_imports;
create policy session_action_animal_imports_access on public.livestock_work_session_action_animal_imports for all to authenticated
 using(exists(select 1 from public.livestock_work_session_actions a join public.livestock_work_sessions s on s.id=a.session_id where a.id=action_id and public.can_access_farm(s.farm_id)))
 with check(exists(select 1 from public.livestock_work_session_actions a join public.livestock_work_sessions s on s.id=a.session_id where a.id=action_id and public.can_manage_farm(s.farm_id)));
drop policy if exists import_audit_read on public.livestock_import_audit_logs;
drop policy if exists import_audit_insert on public.livestock_import_audit_logs;
create policy import_audit_read on public.livestock_import_audit_logs for select to authenticated using(exists(select 1 from public.livestock_imports i where i.id=import_id and public.can_access_farm(i.farm_id)));
create policy import_audit_insert on public.livestock_import_audit_logs for insert to authenticated with check(performed_by=auth.uid() and exists(select 1 from public.livestock_imports i where i.id=import_id and public.can_manage_farm(i.farm_id)));

insert into public.livestock_session_type_catalog(code,name,description,created_by)
select v.code,v.name,v.description,p.id from(values
 ('caravaneo','Caravaneo','Identificación visual o electrónica'),('destete','Destete','Separación de terneros de sus madres'),
 ('pesaje','Pesaje','Jornada de control de peso'),('sanidad','Sanidad','Jornada sanitaria'),('reproduccion','Reproducción','Trabajo reproductivo'),
 ('movimiento','Movimiento','Movimiento o cambio de rodeo'),('clasificacion','Clasificación','Clasificación de hacienda'),('otro','Otro','Otro trabajo ganadero')
)v(code,name,description) cross join lateral(select id from public.profiles where role='super_admin' and active order by created_at limit 1)p
on conflict(name) do update set code=excluded.code,description=excluded.description;

insert into public.livestock_action_type_catalog(code,name,event_type,health_action,supports_general_dose,supports_individual_dose,created_by)
select v.code,v.name,v.event_type,v.health,v.general_dose,v.individual_dose,p.id from(values
 ('lectura','Lectura','lectura',false,false,false),('identificacion','Identificación','identificacion',false,false,false),
 ('pesaje','Pesaje','pesaje',false,false,false),('condicion_corporal','Condición corporal','condicion_corporal',false,false,false),
 ('vacunacion','Vacunación','vacunacion',true,true,true),('desparasitacion','Desparasitación','desparasitacion',true,true,true),
 ('tratamiento','Tratamiento','tratamiento',true,true,true),('tacto','Tacto','tacto',false,false,false),
 ('estado_reproductivo','Estado reproductivo','estado_reproductivo',false,false,false),('diagnostico_prenez','Diagnóstico de preñez','diagnostico_prenez',false,false,false),
 ('destete','Destete','destete',false,false,false),('clasificacion','Clasificación','clasificacion',false,false,false),
 ('cambio_rodeo','Cambio de rodeo','cambio_rodeo',false,false,false),('movimiento','Movimiento','movimiento',false,false,false),('otro','Otro','otro',false,false,false)
)v(code,name,event_type,health,general_dose,individual_dose) cross join lateral(select id from public.profiles where role='super_admin' and active order by created_at limit 1)p
on conflict(name) do update set code=excluded.code,event_type=excluded.event_type,health_action=excluded.health_action,supports_general_dose=excluded.supports_general_dose,supports_individual_dose=excluded.supports_individual_dose;

create or replace function public.can_deactivate_import_created_animal(p_animal_id uuid,p_import_id uuid) returns boolean
language sql stable security invoker set search_path=public as $$
 select exists(select 1 from public.livestock_import_rows r where r.import_id=p_import_id and r.animal_id=p_animal_id and r.result='NUEVO')
 and not exists(select 1 from public.animal_events e where e.animal_id=p_animal_id and e.import_id is distinct from p_import_id)
 and not exists(select 1 from public.livestock_import_rows r where r.animal_id=p_animal_id and r.import_id<>p_import_id)
 and not exists(select 1 from public.health_event_animals h where h.animal_id=p_animal_id)
 and not exists(select 1 from public.health_events h where h.animal_id=p_animal_id)
 and not exists(select 1 from public.reproductive_events r where r.animal_id=p_animal_id)
 and not exists(select 1 from public.livestock_work_session_animals wa where wa.animal_id=p_animal_id and
  (wa.created_from_import_id is distinct from p_import_id or exists(select 1 from public.livestock_work_session_animal_imports x where x.session_id=wa.session_id and x.animal_id=wa.animal_id and x.import_id<>p_import_id)))
 and not exists(select 1 from public.livestock_work_session_action_animals aa where aa.animal_id=p_animal_id and
  (aa.created_from_import_id is distinct from p_import_id or exists(select 1 from public.livestock_work_session_action_animal_imports x where x.action_id=aa.action_id and x.animal_id=aa.animal_id and x.import_id<>p_import_id)));
$$;

-- Alias conservado para clientes históricos: ya no autoriza un DELETE físico.
create or replace function public.can_delete_import_created_animal(p_animal_id uuid,p_import_id uuid) returns boolean
language sql stable security invoker set search_path=public as $$
 select public.can_deactivate_import_created_animal(p_animal_id,p_import_id);
$$;

create or replace function public.annul_livestock_import(p_import_id uuid,p_reason text) returns void
language plpgsql security invoker set search_path=public as $$
declare v_farm uuid;
begin
 select farm_id into v_farm from public.livestock_imports where id=p_import_id;
 if v_farm is null or not public.can_manage_farm(v_farm) then raise exception 'Importación inexistente o sin permisos';end if;
 if nullif(trim(p_reason),'') is null then raise exception 'El motivo es obligatorio';end if;
 update public.livestock_imports set status='anulado',annulled_at=now(),annulled_by=auth.uid() where id=p_import_id and status<>'revertido';
 insert into public.livestock_import_audit_logs(import_id,action,detail,performed_by) values(p_import_id,'anular',jsonb_build_object('reason',trim(p_reason)),auth.uid());
end $$;

create or replace function public.preview_livestock_import_reversal(p_import_id uuid) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare v_farm uuid;v_session uuid;v_mode text;v_session_created boolean;v_created int;v_removable int;v_events int;v_participants int;v_actions int;v_action_animals int;
begin
 select farm_id,work_session_id,session_mode into v_farm,v_session,v_mode from public.livestock_imports where id=p_import_id;
 if v_farm is null or not public.can_access_farm(v_farm) then raise exception 'Importación inexistente o sin permisos';end if;
 select count(distinct animal_id) into v_created from public.livestock_import_rows where import_id=p_import_id and result='NUEVO' and animal_id is not null;
 select count(*) into v_removable from public.animals a where public.can_deactivate_import_created_animal(a.id,p_import_id);
 select count(*) into v_events from public.animal_events where import_id=p_import_id and voided_at is null;
 select exists(select 1 from public.livestock_work_sessions s where s.id=v_session and s.created_from_import_id=p_import_id) into v_session_created;
 if v_session_created then
  v_participants:=0;v_actions:=0;v_action_animals:=0;
 else
  select count(*) into v_participants from public.livestock_work_session_animals wa where wa.created_from_import_id=p_import_id and not exists(select 1 from public.livestock_work_session_animal_imports x where x.session_id=wa.session_id and x.animal_id=wa.animal_id and x.import_id<>p_import_id);
  select count(*) into v_actions from public.livestock_work_session_actions a where a.created_from_import_id=p_import_id
   and not exists(select 1 from public.livestock_work_session_action_imports x where x.action_id=a.id and x.import_id<>p_import_id)
   and not exists(select 1 from public.livestock_work_session_action_animals aa where aa.action_id=a.id and aa.created_from_import_id is distinct from p_import_id);
  select count(*) into v_action_animals from public.livestock_work_session_action_animals aa where aa.created_from_import_id=p_import_id and not exists(select 1 from public.livestock_work_session_action_animal_imports x where x.action_id=aa.action_id and x.animal_id=aa.animal_id and x.import_id<>p_import_id);
 end if;
 return jsonb_build_object('session_mode',v_mode,'session_id',v_session,
  'session_will_be_annulled',v_session_created,
  'created_animals',v_created,'deactivatable_animals',v_removable,'removable_animals',0,'protected_animals',v_created-v_removable,
  'events_to_remove',v_events,'participants_to_remove',v_participants,'actions_to_remove',v_actions,'action_animals_to_remove',v_action_animals);
end $$;

create or replace function public.revert_livestock_import(p_import_id uuid,p_reason text) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare v_farm uuid;v_preview jsonb;v_session uuid;v_session_created boolean;
begin
 if not public.is_super_admin() then raise exception 'Solo un super administrador puede revertir importaciones';end if;
 if nullif(trim(p_reason),'') is null then raise exception 'El motivo es obligatorio';end if;
 select i.farm_id,i.work_session_id,coalesce(s.created_from_import_id=i.id,false) into v_farm,v_session,v_session_created
 from public.livestock_imports i left join public.livestock_work_sessions s on s.id=i.work_session_id
 where i.id=p_import_id and i.status<>'revertido';
 if v_farm is null then raise exception 'Importación inexistente o ya revertida';end if;
 v_preview:=public.preview_livestock_import_reversal(p_import_id);
 update public.animal_events set voided_at=now(),voided_by=auth.uid(),voided_from_import_id=p_import_id,void_reason=trim(p_reason)
  where import_id=p_import_id and voided_at is null;
 if not v_session_created then
  -- Si otra importación sigue usando la relación, se transfiere su origen antes de retirar esta procedencia.
  update public.livestock_work_session_action_animals aa set created_from_import_id=(
   select x.import_id from public.livestock_work_session_action_animal_imports x
   join public.livestock_imports i on i.id=x.import_id
   where x.action_id=aa.action_id and x.animal_id=aa.animal_id and x.import_id<>p_import_id and i.status<>'revertido'
   order by x.created_at limit 1
  ) where aa.created_from_import_id=p_import_id and exists(
   select 1 from public.livestock_work_session_action_animal_imports x join public.livestock_imports i on i.id=x.import_id
   where x.action_id=aa.action_id and x.animal_id=aa.animal_id and x.import_id<>p_import_id and i.status<>'revertido'
  );
  update public.livestock_work_session_actions a set created_from_import_id=(
   select x.import_id from public.livestock_work_session_action_imports x join public.livestock_imports i on i.id=x.import_id
   where x.action_id=a.id and x.import_id<>p_import_id and i.status<>'revertido' order by x.created_at limit 1
  ) where a.created_from_import_id=p_import_id and exists(
   select 1 from public.livestock_work_session_action_imports x join public.livestock_imports i on i.id=x.import_id
   where x.action_id=a.id and x.import_id<>p_import_id and i.status<>'revertido'
  );
  update public.livestock_work_session_animals wa set created_from_import_id=(
   select x.import_id from public.livestock_work_session_animal_imports x join public.livestock_imports i on i.id=x.import_id
   where x.session_id=wa.session_id and x.animal_id=wa.animal_id and x.import_id<>p_import_id and i.status<>'revertido'
   order by x.created_at limit 1
  ) where wa.created_from_import_id=p_import_id and exists(
   select 1 from public.livestock_work_session_animal_imports x join public.livestock_imports i on i.id=x.import_id
   where x.session_id=wa.session_id and x.animal_id=wa.animal_id and x.import_id<>p_import_id and i.status<>'revertido'
  );
  delete from public.livestock_work_session_action_animals aa where aa.created_from_import_id=p_import_id and not exists(select 1 from public.livestock_work_session_action_animal_imports x where x.action_id=aa.action_id and x.animal_id=aa.animal_id and x.import_id<>p_import_id);
  delete from public.livestock_work_session_actions a where a.created_from_import_id=p_import_id
   and not exists(select 1 from public.livestock_work_session_action_imports x where x.action_id=a.id and x.import_id<>p_import_id)
   and not exists(select 1 from public.livestock_work_session_action_animals aa where aa.action_id=a.id and aa.created_from_import_id is distinct from p_import_id);
  delete from public.livestock_work_session_animals wa where wa.created_from_import_id=p_import_id and not exists(select 1 from public.livestock_work_session_animal_imports x where x.session_id=wa.session_id and x.animal_id=wa.animal_id and x.import_id<>p_import_id);
 end if;
 if not v_session_created then
  delete from public.livestock_work_session_action_animal_imports where import_id=p_import_id;
  delete from public.livestock_work_session_action_imports where import_id=p_import_id;
  delete from public.livestock_work_session_animal_imports where import_id=p_import_id;
 end if;
 update public.animals set active=false,status='revertido',reverted_at=now(),reverted_by=auth.uid(),
  reverted_from_import_id=p_import_id,reversal_reason=trim(p_reason),updated_at=now()
 where public.can_deactivate_import_created_animal(id,p_import_id);
 if v_session_created then update public.livestock_work_sessions set status='anulada',notes=concat_ws(' · ',notes,'Importación revertida: '||trim(p_reason)),updated_at=now() where id=v_session;end if;
 update public.livestock_imports set status='revertido',reversed_at=now(),reversed_by=auth.uid(),
  content_hash=coalesce(content_hash,file_hash),file_hash=file_hash||':reverted:'||id::text
 where id=p_import_id;
 insert into public.livestock_import_audit_logs(import_id,action,detail,performed_by) values(p_import_id,'revertir',v_preview||jsonb_build_object('reason',trim(p_reason)),auth.uid());
 return v_preview;
end $$;
