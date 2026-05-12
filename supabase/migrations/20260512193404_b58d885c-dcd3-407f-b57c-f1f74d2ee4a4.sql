CREATE OR REPLACE FUNCTION public.issue_tasking(p_source_pseudonym text, p_priority text, p_pir text, p_title text, p_body text, p_due_at timestamp with time zone)
 RETURNS TABLE(tasking_id uuid, task_id_display text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_handler_id uuid;
  v_source_id uuid;
  v_pseudonym_clean text;
  v_seq int;
  v_task_id_display text;
  v_tasking_id uuid;
BEGIN
  v_handler_id := public.current_handler_id();
  IF v_handler_id IS NULL THEN
    RAISE EXCEPTION 'NotAHandler' USING errcode = '42501';
  END IF;

  SELECT id INTO v_source_id
  FROM public.sources_operational
  WHERE pseudonym = p_source_pseudonym AND handler_id = v_handler_id;

  IF v_source_id IS NULL THEN
    RAISE EXCEPTION 'SourceNotFoundOrOutOfScope: %', p_source_pseudonym USING errcode = '42501';
  END IF;

  v_pseudonym_clean := replace(p_source_pseudonym, 'S-', '');

  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(t.task_id_display, '^TSK-S\d+-', ''), '') AS int)
  ), 0) + 1 INTO v_seq
  FROM public.taskings t
  WHERE t.task_id_display LIKE 'TSK-S' || v_pseudonym_clean || '-%';

  v_task_id_display := 'TSK-S' || v_pseudonym_clean || '-' || lpad(v_seq::text, 4, '0');

  INSERT INTO public.taskings (source_id, handler_id, task_id_display, priority, pir, title, body, due_at, status, is_new)
  VALUES (v_source_id, v_handler_id, v_task_id_display, p_priority, p_pir, p_title, p_body, p_due_at, 'active', true)
  RETURNING id INTO v_tasking_id;

  RETURN QUERY SELECT v_tasking_id, v_task_id_display;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_report(p_source_pseudonym text, p_category text, p_sub_category text, p_person_sex text, p_person_age text, p_person_build text, p_person_features text, p_mgrs text, p_named_place text, p_when_observed text, p_activity text, p_has_photo boolean, p_has_voice boolean, p_basis_of_knowledge text, p_confidence text)
 RETURNS TABLE(report_id uuid, report_id_display text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_source_id uuid;
  v_handler_id uuid;
  v_pseudonym_clean text;
  v_seq int;
  v_report_id_display text;
  v_report_id uuid;
BEGIN
  SELECT id, handler_id INTO v_source_id, v_handler_id
  FROM public.sources_operational
  WHERE pseudonym = p_source_pseudonym;

  IF v_source_id IS NULL THEN
    RAISE EXCEPTION 'SourceNotFound: %', p_source_pseudonym USING errcode = '42501';
  END IF;

  v_pseudonym_clean := replace(p_source_pseudonym, 'S-', '');

  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(r.report_id_display, '^RPT-S\d+-', ''), '') AS int)
  ), 0) + 1 INTO v_seq
  FROM public.reports r
  WHERE r.report_id_display LIKE 'RPT-S' || v_pseudonym_clean || '-%';

  v_report_id_display := 'RPT-S' || v_pseudonym_clean || '-' || lpad(v_seq::text, 4, '0');

  INSERT INTO public.reports (
    source_id, handler_id, report_id_display, category, sub_category,
    person_sex, person_age, person_build, person_features,
    mgrs, named_place, when_observed, activity,
    has_photo, has_voice, basis_of_knowledge, confidence
  )
  VALUES (
    v_source_id, v_handler_id, v_report_id_display, p_category, p_sub_category,
    p_person_sex, p_person_age, p_person_build, p_person_features,
    p_mgrs, p_named_place, p_when_observed, p_activity,
    p_has_photo, p_has_voice, p_basis_of_knowledge, p_confidence
  )
  RETURNING id INTO v_report_id;

  RETURN QUERY SELECT v_report_id, v_report_id_display;
END;
$function$;