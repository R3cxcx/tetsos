-- Create a generic ID sequences table and utilities for multi-entity ID management
-- Table: public.id_sequences
CREATE TABLE IF NOT EXISTS public.id_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL, -- e.g., 'employee', 'recruitment_request', 'hiring_request'
  description text,
  prefix text NOT NULL DEFAULT '',
  separator text NOT NULL DEFAULT '',
  padding integer NOT NULL DEFAULT 4 CHECK (padding >= 0 AND padding <= 12),
  suffix text NOT NULL DEFAULT '',
  next_number bigint NOT NULL DEFAULT 1 CHECK (next_number >= 0),
  target_table text,   -- optional: table to validate against (public schema)
  target_column text,  -- optional: column to validate (text)
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_id_sequences_key ON public.id_sequences(key);

-- Enable RLS
ALTER TABLE public.id_sequences ENABLE ROW LEVEL SECURITY;

-- Policies: Only admins/super_admins can manage and view sequences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'id_sequences' AND policyname = 'Admins can view id sequences'
  ) THEN
    CREATE POLICY "Admins can view id sequences" ON public.id_sequences
    FOR SELECT USING (
      public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'id_sequences' AND policyname = 'Admins can insert id sequences'
  ) THEN
    CREATE POLICY "Admins can insert id sequences" ON public.id_sequences
    FOR INSERT WITH CHECK (
      public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'id_sequences' AND policyname = 'Admins can update id sequences'
  ) THEN
    CREATE POLICY "Admins can update id sequences" ON public.id_sequences
    FOR UPDATE USING (
      public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)
    ) WITH CHECK (
      public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)
    );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'id_sequences' AND policyname = 'Admins can delete id sequences'
  ) THEN
    CREATE POLICY "Admins can delete id sequences" ON public.id_sequences
    FOR DELETE USING (
      public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)
    );
  END IF;
END $$;

-- Updated at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_id_sequences_updated_at'
  ) THEN
    CREATE TRIGGER trg_update_id_sequences_updated_at
    BEFORE UPDATE ON public.id_sequences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Function: next_formatted_id
CREATE OR REPLACE FUNCTION public.next_formatted_id(p_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_seq public.id_sequences;
  v_number text;
  v_result text;
BEGIN
  SELECT * INTO v_seq
  FROM public.id_sequences
  WHERE key = p_key AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sequence with key % not found or inactive', p_key;
  END IF;

  v_number := lpad(v_seq.next_number::text, v_seq.padding, '0');
  v_result := coalesce(v_seq.prefix, '') || coalesce(v_seq.separator, '') || v_number || coalesce(v_seq.suffix, '');

  UPDATE public.id_sequences
  SET next_number = v_seq.next_number + 1,
      updated_at = now()
  WHERE id = v_seq.id;

  RETURN v_result;
END;
$$;

-- Trigger to auto-assign employee_id on insert if missing/blank
CREATE OR REPLACE FUNCTION public.assign_employee_id_from_sequence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF NEW.employee_id IS NULL OR btrim(NEW.employee_id) = '' THEN
    NEW.employee_id := public.next_formatted_id('employee');
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_assign_employee_id_from_sequence'
  ) THEN
    CREATE TRIGGER trg_assign_employee_id_from_sequence
    BEFORE INSERT ON public.employees
    FOR EACH ROW EXECUTE FUNCTION public.assign_employee_id_from_sequence();
  END IF;
END $$;

-- Helper to escape regex special characters
CREATE OR REPLACE FUNCTION public.escape_regex_text(p_text text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF p_text IS NULL THEN RETURN ''; END IF;
  RETURN regexp_replace(p_text, '([\\.\^\$\*\+\?\(\)\[\]\{\}\|\-])', '\\\\1', 'g');
END;
$$;

-- Validation function to check target table/column for invalid or duplicate IDs
CREATE OR REPLACE FUNCTION public.validate_sequence_ids(p_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_seq public.id_sequences;
  v_pattern text;
  v_total bigint := 0;
  v_invalid bigint := 0;
  v_dup_count bigint := 0;
  v_invalid_samples text[] := '{}';
  v_dup_samples jsonb := '[]'::jsonb;
  v_sql text;
BEGIN
  SELECT * INTO v_seq FROM public.id_sequences WHERE key = p_key;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Sequence not found');
  END IF;

  IF v_seq.target_table IS NULL OR v_seq.target_column IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'No target table/column configured for this sequence',
      'key', p_key,
      'pattern', NULL,
      'total', 0,
      'invalid_count', 0,
      'duplicate_count', 0,
      'invalid_samples', jsonb_build_array(),
      'duplicate_samples', jsonb_build_array()
    );
  END IF;

  v_pattern := '^' || public.escape_regex_text(coalesce(v_seq.prefix,'')) ||
               public.escape_regex_text(coalesce(v_seq.separator,'')) ||
               '\\d{' || v_seq.padding::text || '}' ||
               public.escape_regex_text(coalesce(v_seq.suffix,'')) || '$';

  -- Total count
  v_sql := format('SELECT count(*) FROM public.%I WHERE %I IS NOT NULL', v_seq.target_table, v_seq.target_column);
  EXECUTE v_sql INTO v_total;

  -- Invalid samples (up to 10)
  v_sql := format('SELECT array_agg(%1$I) FROM (SELECT %1$I FROM public.%2$I WHERE %1$I IS NOT NULL AND %1$I !~ %3$L LIMIT 10) t', v_seq.target_column, v_seq.target_table, v_pattern);
  EXECUTE v_sql INTO v_invalid_samples;

  -- Invalid count
  v_sql := format('SELECT count(*) FROM public.%2$I WHERE %1$I IS NOT NULL AND %1$I !~ %3$L', v_seq.target_column, v_seq.target_table, v_pattern);
  EXECUTE v_sql INTO v_invalid;

  -- Duplicate samples (top 5)
  v_sql := format($f$
    SELECT coalesce(jsonb_agg(jsonb_build_object('value', val, 'count', cnt)), '[]'::jsonb)
    FROM (
      SELECT %1$I AS val, count(*) AS cnt
      FROM public.%2$I
      WHERE %1$I IS NOT NULL
      GROUP BY %1$I
      HAVING count(*) > 1
      ORDER BY cnt DESC
      LIMIT 5
    ) d
  $f$, v_seq.target_column, v_seq.target_table);
  EXECUTE v_sql INTO v_dup_samples;

  -- Duplicate total count
  v_sql := format('SELECT coalesce(sum(cnt),0) FROM (SELECT count(*) AS cnt FROM public.%2$I WHERE %1$I IS NOT NULL GROUP BY %1$I HAVING count(*) > 1) s', v_seq.target_column, v_seq.target_table);
  EXECUTE v_sql INTO v_dup_count;

  RETURN jsonb_build_object(
    'success', true,
    'key', p_key,
    'pattern', v_pattern,
    'total', v_total,
    'invalid_count', v_invalid,
    'duplicate_count', v_dup_count,
    'invalid_samples', to_jsonb(coalesce(v_invalid_samples, '{}')),
    'duplicate_samples', v_dup_samples
  );
EXCEPTION WHEN undefined_table OR undefined_column THEN
  RETURN jsonb_build_object('success', false, 'message', 'Target table or column does not exist', 'key', p_key);
END;
$$;

-- Seed a default 'employee' sequence if missing
INSERT INTO public.id_sequences (key, description, prefix, separator, padding, suffix, next_number, target_table, target_column, is_active)
SELECT 'employee', 'Employee code sequence', 'EMP', '', 4, '', 1, 'employees', 'employee_id', true
WHERE NOT EXISTS (SELECT 1 FROM public.id_sequences WHERE key = 'employee');