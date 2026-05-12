-- 2.1 taskings
CREATE TABLE public.taskings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.sources_operational(id) ON DELETE CASCADE,
  handler_id uuid NOT NULL REFERENCES public.handlers(id) ON DELETE RESTRICT,
  task_id_display text NOT NULL UNIQUE,
  priority text NOT NULL CHECK (priority IN ('time_sensitive','priority','routine')),
  pir text,
  title text NOT NULL,
  body text,
  due_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','reported','cancelled')),
  is_new boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.taskings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "handler reads own taskings" ON public.taskings
  FOR SELECT TO authenticated USING (handler_id = public.current_handler_id());

-- POC demo policy; production uses source-side authenticated sessions per ICP §8
CREATE POLICY "anon reads taskings for mobile" ON public.taskings
  FOR SELECT TO anon USING (true);

-- 2.2 reports
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.sources_operational(id) ON DELETE RESTRICT,
  handler_id uuid NOT NULL REFERENCES public.handlers(id) ON DELETE RESTRICT,
  report_id_display text NOT NULL UNIQUE,
  tasking_id uuid REFERENCES public.taskings(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('person','place','event','movement','conversation','money','official','community','other')),
  sub_category text,
  person_sex text,
  person_age text,
  person_build text,
  person_features text,
  mgrs text,
  location_offset_m int DEFAULT 250,
  named_place text,
  when_observed text,
  activity text,
  has_photo boolean DEFAULT false,
  has_voice boolean DEFAULT false,
  basis_of_knowledge text NOT NULL CHECK (basis_of_knowledge IN ('saw_self','someone_told_me','read_written')),
  confidence text NOT NULL CHECK (confidence IN ('low','med','high')),
  validation_status text NOT NULL DEFAULT 'pending_validation' CHECK (validation_status IN ('pending_validation','validated','rejected','on_hold')),
  validated_by_handler_id uuid REFERENCES public.handlers(id),
  validated_at timestamptz,
  validation_notes text,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "handler reads own reports" ON public.reports
  FOR SELECT TO authenticated USING (handler_id = public.current_handler_id());

CREATE POLICY "handler updates own reports" ON public.reports
  FOR UPDATE TO authenticated USING (handler_id = public.current_handler_id());

-- POC demo policy; production uses source-side authenticated sessions per ICP §8
CREATE POLICY "anon reads reports for mobile" ON public.reports
  FOR SELECT TO anon USING (true);

-- 2.3 issue_tasking
CREATE OR REPLACE FUNCTION public.issue_tasking(
  p_source_pseudonym text,
  p_priority text,
  p_pir text,
  p_title text,
  p_body text,
  p_due_at timestamptz
)
RETURNS TABLE (tasking_id uuid, task_id_display text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    CAST(NULLIF(regexp_replace(task_id_display, '^TSK-S\d+-', ''), '') AS int)
  ), 0) + 1 INTO v_seq
  FROM public.taskings
  WHERE task_id_display LIKE 'TSK-S' || v_pseudonym_clean || '-%';

  v_task_id_display := 'TSK-S' || v_pseudonym_clean || '-' || lpad(v_seq::text, 4, '0');

  INSERT INTO public.taskings (source_id, handler_id, task_id_display, priority, pir, title, body, due_at, status, is_new)
  VALUES (v_source_id, v_handler_id, v_task_id_display, p_priority, p_pir, p_title, p_body, p_due_at, 'active', true)
  RETURNING id INTO v_tasking_id;

  RETURN QUERY SELECT v_tasking_id, v_task_id_display;
END;
$$;

GRANT EXECUTE ON FUNCTION public.issue_tasking(text,text,text,text,text,timestamptz) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.issue_tasking(text,text,text,text,text,timestamptz) FROM anon, public;

-- 2.4 validate_report
CREATE OR REPLACE FUNCTION public.validate_report(
  p_report_id uuid,
  p_decision text,
  p_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_handler_id uuid;
BEGIN
  IF p_decision NOT IN ('validated','rejected','on_hold') THEN
    RAISE EXCEPTION 'InvalidDecision: must be validated, rejected, or on_hold' USING errcode = '22023';
  END IF;

  v_handler_id := public.current_handler_id();
  IF v_handler_id IS NULL THEN
    RAISE EXCEPTION 'NotAHandler' USING errcode = '42501';
  END IF;

  UPDATE public.reports
  SET validation_status = p_decision,
      validated_by_handler_id = v_handler_id,
      validated_at = now(),
      validation_notes = p_notes
  WHERE id = p_report_id AND handler_id = v_handler_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ReportNotFoundOrOutOfScope' USING errcode = '42501';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_report(uuid,text,text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_report(uuid,text,text) FROM anon, public;

-- 2.5 submit_report
CREATE OR REPLACE FUNCTION public.submit_report(
  p_source_pseudonym text,
  p_category text,
  p_sub_category text,
  p_person_sex text,
  p_person_age text,
  p_person_build text,
  p_person_features text,
  p_mgrs text,
  p_named_place text,
  p_when_observed text,
  p_activity text,
  p_has_photo boolean,
  p_has_voice boolean,
  p_basis_of_knowledge text,
  p_confidence text
)
RETURNS TABLE (report_id uuid, report_id_display text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    CAST(NULLIF(regexp_replace(report_id_display, '^RPT-S\d+-', ''), '') AS int)
  ), 0) + 1 INTO v_seq
  FROM public.reports
  WHERE report_id_display LIKE 'RPT-S' || v_pseudonym_clean || '-%';

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
$$;

GRANT EXECUTE ON FUNCTION public.submit_report(text,text,text,text,text,text,text,text,text,text,text,boolean,boolean,text,text) TO anon, authenticated;

-- 2.6 mobile_demo_login
CREATE OR REPLACE FUNCTION public.mobile_demo_login(p_pseudonym text)
RETURNS TABLE (
  source_id uuid,
  pseudonym text,
  handler_callsign text,
  aor text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.pseudonym, h.callsign, s.aor
  FROM public.sources_operational s
  JOIN public.handlers h ON s.handler_id = h.id
  WHERE s.pseudonym = p_pseudonym
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mobile_demo_login(text) TO anon, authenticated;

-- 2.7 Seed demo taskings
INSERT INTO public.taskings (source_id, handler_id, task_id_display, priority, pir, title, body, due_at, status, is_new)
SELECT s.id, s.handler_id, 'TSK-S7421-0089', 'time_sensitive', 'PIR-1',
  'Document movement of suspected lieutenant vehicle',
  'Photo-document any vehicle activity at the Hwy 23 access road observation point. Dawn window preferred.',
  now() + interval '4 hours 12 minutes', 'active', true
FROM public.sources_operational s WHERE s.pseudonym = 'S-7421';

INSERT INTO public.taskings (source_id, handler_id, task_id_display, priority, pir, title, body, due_at, status, is_new)
SELECT s.id, s.handler_id, 'TSK-S7421-0091', 'priority', 'PIR-1',
  'Pattern of life — Plaza Allende café',
  'Three visits over the next 5 days. Note arrivals, departures, table positions, who they sit with.',
  now() + interval '5 days', 'active', true
FROM public.sources_operational s WHERE s.pseudonym = 'S-7421';
