-- Create is_owner function
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'owner'
  )
$$;

-- Create platform_settings table for storing API keys and other settings
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only owner can manage platform settings
CREATE POLICY "Owner can view platform settings"
ON public.platform_settings
FOR SELECT
USING (public.is_owner(auth.uid()));

CREATE POLICY "Owner can insert platform settings"
ON public.platform_settings
FOR INSERT
WITH CHECK (public.is_owner(auth.uid()));

CREATE POLICY "Owner can update platform settings"
ON public.platform_settings
FOR UPDATE
USING (public.is_owner(auth.uid()));

CREATE POLICY "Owner can delete platform settings"
ON public.platform_settings
FOR DELETE
USING (public.is_owner(auth.uid()));

-- Assign owner role to trickyhubagency@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('bc365258-4d65-4589-a25e-0bf0393a6308', 'owner')
ON CONFLICT (user_id, role) DO NOTHING;