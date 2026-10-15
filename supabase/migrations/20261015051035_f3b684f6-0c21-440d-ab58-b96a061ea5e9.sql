CREATE OR REPLACE FUNCTION public.mail_center_list(p_tab text DEFAULT 'all'::text, p_search text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_airline text DEFAULT NULL::text, p_date_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_date_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_page integer DEFAULT 1, p_page_size integer DEFAULT 50, p_from_email text DEFAULT NULL::text, p_has_error boolean DEFAULT false, p_has_missing boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_size int := least(greatest(coalesce(p_page_size,50),1),100);
 v_off int := (greatest(coalesce(p_page,1),1)-1)*least(greatest(coalesce(p_page_size,50),1),100);
 v_s text := nullif(btrim(coalesce(p_search,'')),''); v_res jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Forbidden'; END IF;
 WITH src AS (
  SELECT 'queue'::text src, q.id, q.email, q.customer_name, q.phone, q.pnrs, q.missing_pnrs,
   upper(q.status) status, q.airline, q.from_email, q.last_error, q.retry_count, q.created_at ts
  FROM mail_queue q WHERE coalesce(p_tab,'all') IN ('all','queue')
  UNION ALL
  SELECT 'log', l.id, l.email, l.customer_name, l.phone, l.pnrs, l.missing_pnrs,
   upper(l.status), l.airline, l.from_email, l.last_error, l.retry_count, coalesce(l.sent_at,l.archived_at)
  FROM mail_queue_log l WHERE coalesce(p_tab,'all') IN ('all','log')
 ), f AS (
  SELECT * FROM src WHERE
   (v_s IS NULL OR id::text ILIKE '%'||v_s||'%' OR email ILIKE '%'||v_s||'%'
    OR customer_name ILIKE '%'||v_s||'%' OR phone ILIKE '%'||v_s||'%' OR pnrs::text ILIKE '%'||v_s||'%')
   AND (p_status IS NULL OR (p_status='NEEDS_REVIEW' AND status IN ('NEEDS_REVIEW','UNCERTAIN')) OR status = p_status)
   AND (p_airline IS NULL OR (p_airline='SUN' AND upper(airline) IN ('SUN','SPA')) OR upper(airline)=p_airline)
   AND (p_date_from IS NULL OR ts >= p_date_from) AND (p_date_to IS NULL OR ts < p_date_to)
   AND (p_from_email IS NULL OR from_email ILIKE '%'||p_from_email||'%')
   AND (NOT coalesce(p_has_error,false) OR nullif(btrim(last_error),'') IS NOT NULL)
   AND (NOT coalesce(p_has_missing,false) OR coalesce(jsonb_array_length(missing_pnrs),0) > 0)
 )
 SELECT jsonb_build_object('total',(SELECT count(*) FROM f),
  'rows', coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT src,id,email,customer_name,phone,pnrs,missing_pnrs,status,airline,from_email,ts
   FROM f ORDER BY ts DESC NULLS LAST, id DESC LIMIT v_size OFFSET v_off) x),'[]'::jsonb))
 INTO v_res;
 RETURN v_res;
END $function$;

CREATE OR REPLACE FUNCTION public.mail_center_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_day timestamptz := (date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh')) AT TIME ZONE 'Asia/Ho_Chi_Minh';
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Forbidden'; END IF;
 RETURN jsonb_build_object(
  'waiting',(SELECT count(*) FROM mail_queue WHERE upper(status) IN ('WAITING','READY','RETRY','PENDING')),
  'processing',(SELECT count(*) FROM mail_queue WHERE upper(status)='PROCESSING'),
  'sent_today',(SELECT count(*) FROM mail_queue_log WHERE upper(status)='SENT' AND sent_at>=v_day)
     + (SELECT count(*) FROM mail_queue WHERE upper(status)='SENT' AND sent_at>=v_day),
  'needs_review',(SELECT count(*) FROM mail_queue WHERE upper(status) IN ('NEEDS_REVIEW','UNCERTAIN','FAILED')));
END $function$;

CREATE OR REPLACE FUNCTION public.mail_center_detail(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT to_jsonb(q) - 'worker_token' || jsonb_build_object('src','queue') INTO v FROM mail_queue q WHERE id=p_id;
 IF v IS NULL THEN
  SELECT to_jsonb(l) || jsonb_build_object('src','log') INTO v FROM mail_queue_log l WHERE id=p_id;
 END IF;
 RETURN v;
END $function$;