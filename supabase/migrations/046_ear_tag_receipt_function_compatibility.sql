begin;

-- Some databases applied 045 before the optional bag details were removed.
-- Preserve that implementation and its data, exposing the seven-argument API
-- used by the current form. On a fresh database, 045 already provides that API.
do $migration$
begin
  if to_regprocedure('public.receive_ear_tag_bag(uuid,uuid,date,text,text,integer,jsonb,jsonb)') is not null then
    execute $definition$
      create or replace function public.receive_ear_tag_bag(
        p_receipt_id uuid,
        p_renspa_id uuid,
        p_received_on date,
        p_first_eid text,
        p_last_eid text,
        p_declared_quantity integer,
        p_ranges jsonb
      ) returns uuid
      language sql
      security invoker
      set search_path = ''
      as $body$
        select public.receive_ear_tag_bag(
          p_receipt_id := p_receipt_id,
          p_renspa_id := p_renspa_id,
          p_received_on := p_received_on,
          p_first_eid := p_first_eid,
          p_last_eid := p_last_eid,
          p_declared_quantity := p_declared_quantity,
          p_details := '{}'::jsonb,
          p_ranges := p_ranges
        );
      $body$;
    $definition$;
  elsif to_regprocedure('public.receive_ear_tag_bag(uuid,uuid,date,text,text,integer,jsonb)') is null then
    raise exception 'Falta la función de recepción de caravanas. Aplicá primero la migración 045';
  end if;
end;
$migration$;

revoke all on function public.receive_ear_tag_bag(uuid,uuid,date,text,text,integer,jsonb) from public, anon;
grant execute on function public.receive_ear_tag_bag(uuid,uuid,date,text,text,integer,jsonb) to authenticated;

notify pgrst, 'reload schema';
commit;
