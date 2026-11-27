begin;

create or replace function public.confirm_gallagher_csv_with_session_type(
  p_filename text,
  p_file_hash text,
  p_headers jsonb,
  p_rows jsonb,
  p_session_type text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
  v_session jsonb;
begin
  if p_session_type is null or p_session_type not in ('otro', 'tacto') then
    raise exception 'Tipo de jornada inválido.';
  end if;

  v_result := public.confirm_gallagher_csv_links(p_filename, p_file_hash, p_headers, p_rows);

  if p_session_type = 'tacto' and not coalesce((v_result->>'already_imported')::boolean, false) then
    for v_session in select value from jsonb_array_elements(v_result->'sessions')
    loop
      perform public.confirm_livestock_tacto(
        (v_session->>'farm_id')::uuid,
        (v_session->>'session_id')::uuid
      );
    end loop;
  end if;

  return v_result;
end;
$$;

revoke all on function public.confirm_gallagher_csv_with_session_type(text, text, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.confirm_gallagher_csv_with_session_type(text, text, jsonb, jsonb, text) to authenticated;

commit;
