-- Create function to fetch user auth metadata (owner only)
CREATE OR REPLACE FUNCTION public.get_user_auth_metadata()
RETURNS TABLE (
  user_id uuid,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  auth_created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, email_confirmed_at, last_sign_in_at, created_at
  FROM auth.users
  WHERE is_owner(auth.uid())
$$;