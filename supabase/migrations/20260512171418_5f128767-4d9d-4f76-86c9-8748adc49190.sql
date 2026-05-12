CREATE OR REPLACE FUNCTION public.register_source(p_true_name text, p_dob date, p_id_document_type text, p_id_document_number text, p_source_type source_type, p_aor text, p_vetting_notes text)
 RETURNS TABLE(source_id uuid, pseudonym text, code text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_handler_id uuid;
  v_registry_id uuid;
  v_source_id uuid;
  v_pseudonym text;
  v_code text;
  v_expires timestamptz := now() + interval '15 minutes';
  v_attempts int := 0;
  c_max_attempts constant int := 50;
begin
  v_handler_id := public.current_handler_id();
  if v_handler_id is null then
    raise exception 'NotAHandler: caller is not a registered handler' using errcode = '42501';
  end if;

  insert into public.source_registry (true_name, dob, id_document_type, id_document_number, vetting_notes, created_by)
  values (p_true_name, p_dob, p_id_document_type, p_id_document_number, p_vetting_notes, v_handler_id)
  returning id into v_registry_id;

  loop
    v_attempts := v_attempts + 1;
    v_pseudonym := 'S-' || lpad((1000 + floor(random() * 9000))::int::text, 4, '0');
    exit when not exists (select 1 from public.sources_operational so where so.pseudonym = v_pseudonym);
    if v_attempts >= c_max_attempts then
      raise exception 'PseudonymSpaceExhausted: could not allocate unique pseudonym after % attempts', c_max_attempts using errcode = 'P0001';
    end if;
  end loop;

  insert into public.sources_operational (registry_id, handler_id, pseudonym, source_type, aor, status)
  values (v_registry_id, v_handler_id, v_pseudonym, p_source_type, p_aor, 'pending_vetting')
  returning id into v_source_id;

  v_code := lpad(floor(random() * 1000000)::int::text, 6, '0');

  insert into public.pairing_codes (source_id, handler_id, code, expires_at)
  values (v_source_id, v_handler_id, v_code, v_expires);

  return query select v_source_id, v_pseudonym, v_code, v_expires;
end;
$function$;