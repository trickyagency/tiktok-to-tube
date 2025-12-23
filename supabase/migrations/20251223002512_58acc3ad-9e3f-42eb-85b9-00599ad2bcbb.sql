-- Create function to check if Apify API key is configured
-- This uses SECURITY DEFINER to bypass RLS and allow any authenticated user to check status
CREATE OR REPLACE FUNCTION public.is_apify_configured()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_settings
    WHERE key = 'apify_api_key'
    AND value IS NOT NULL
    AND value != ''
  );
$$;