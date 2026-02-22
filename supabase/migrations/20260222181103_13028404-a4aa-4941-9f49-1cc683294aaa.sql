-- Update is_apify_configured to always return true since the key is now a server secret
CREATE OR REPLACE FUNCTION public.is_apify_configured()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT true;
$function$;