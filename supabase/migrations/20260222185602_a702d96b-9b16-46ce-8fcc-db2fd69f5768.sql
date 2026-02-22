
CREATE OR REPLACE FUNCTION public.check_quota_available(p_channel_id uuid, p_quota_cost integer DEFAULT 100)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_quota_used INTEGER;
  v_quota_limit INTEGER;
  v_is_paused BOOLEAN;
BEGIN
  SELECT quota_used, quota_limit, is_paused
  INTO v_quota_used, v_quota_limit, v_is_paused
  FROM youtube_quota_usage
  WHERE youtube_channel_id = p_channel_id
    AND date = CURRENT_DATE;

  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;

  IF v_is_paused THEN
    RETURN FALSE;
  END IF;

  RETURN (v_quota_limit - v_quota_used) >= p_quota_cost;
END;
$function$;
