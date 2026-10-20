CREATE OR REPLACE FUNCTION public.customer_flights_list(
  p_pnr text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_customer_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_sent_from timestamptz DEFAULT NULL,
  p_sent_to timestamptz DEFAULT NULL,
  p_fly_from date DEFAULT NULL,
  p_fly_to date DEFAULT NULL,
  p_sort text DEFAULT 'desc',
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_size int := least(greatest(coalesce(p_page_size,20),1),100);
  v_off int := (greatest(coalesce(p_page,1),1)-1)*least(greatest(coalesce(p_page_size,20),1),100);
  v_pnr text := nullif(btrim(coalesce(p_pnr,'')),'');
  v_email text := nullif(btrim(coalesce(p_email,'')),'');
  v_name text := nullif(btrim(coalesce(p_customer_name,'')),'');
  v_phone text := nullif(btrim(coalesce(p_phone,'')),'');
  v_res jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Forbidden'; END IF;

  WITH f AS (
    SELECT l.id, l.pnr, l.email, l.customer_name, l.salutation, l.phone,
           l.mail_type, l.first_sent_at, l.last_sent_at, l.send_count,
           l.trip1, l.day1, l.time1, l.trip2, l.day2, l.time2,
           l.trip3, l.day3, l.time3, l.trip4, l.day4, l.time4
    FROM public.pnr_email_logs l
    WHERE
      (v_pnr IS NULL OR l.pnr ILIKE '%'||v_pnr||'%')
      AND (v_email IS NULL OR l.email ILIKE '%'||v_email||'%')
      AND (v_name IS NULL OR l.customer_name ILIKE '%'||v_name||'%')
      AND (v_phone IS NULL OR l.phone ILIKE '%'||v_phone||'%')
      AND (p_sent_from IS NULL OR l.first_sent_at >= p_sent_from)
      AND (p_sent_to IS NULL OR l.first_sent_at < p_sent_to + interval '1 day')
      AND (
        p_fly_from IS NULL OR p_fly_to IS NULL OR EXISTS (
          SELECT 1 FROM (VALUES (l.day1),(l.day2),(l.day3),(l.day4)) AS d(day_text)
          WHERE nullif(btrim(d.day_text),'') IS NOT NULL
            AND btrim(d.day_text) ~ '^\d{2}/\d{2}/\d{4}$'
            AND to_date(btrim(d.day_text),'DD/MM/YYYY') BETWEEN p_fly_from AND p_fly_to
        )
      )
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM f),
    'rows', coalesce((
      SELECT jsonb_agg(to_jsonb(x)) FROM (
        SELECT * FROM f
        ORDER BY
          CASE WHEN p_sort = 'asc' THEN first_sent_at END ASC NULLS LAST,
          CASE WHEN p_sort <> 'asc' THEN first_sent_at END DESC NULLS LAST,
          id DESC
        LIMIT v_size OFFSET v_off
      ) x
    ), '[]'::jsonb)
  ) INTO v_res;

  RETURN v_res;
END
$function$;

GRANT EXECUTE ON FUNCTION public.customer_flights_list(text,text,text,text,timestamptz,timestamptz,date,date,text,integer,integer) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_pnr_email_logs_pnr ON public.pnr_email_logs (upper(pnr));
CREATE INDEX IF NOT EXISTS idx_pnr_email_logs_email ON public.pnr_email_logs (lower(email));
CREATE INDEX IF NOT EXISTS idx_pnr_email_logs_first_sent_at ON public.pnr_email_logs (first_sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_pnr_email_logs_customer_name ON public.pnr_email_logs (lower(customer_name));