-- Fix syntax error in validate_sequence_ids (duplicate samples JSON keys quoting) and keep exact padding
CREATE OR REPLACE FUNCTION public.validate_sequence_ids(p_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_seq public.id_sequences;
  v_pattern text;
  v_total bigint := 0;
  v_invalid bigint := 0;
  v_dup_count bigint := 0;
  v_invalid_samples text[] := '{}';
  v_dup_samples jsonb := '[]'::jsonb;
  v_sql text;
  v_digit_part text;
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

  -- EXACT padding: numeric part must be exactly padding digits
  v_digit_part := CASE
    WHEN v_seq.padding > 0 THEN '[0-9]{' || v_seq.padding::text || '}'
    ELSE '[0-9]+'
  END;

  v_pattern := '^' || public.escape_regex_text(coalesce(v_seq.prefix,'')) ||
               public.escape_regex_text(coalesce(v_seq.separator,'')) ||
               v_digit_part ||
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

  -- Duplicate samples (top 5) - FIXED QUOTES
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
$function$;