-- Add RLS policies for owner to view all profiles
CREATE POLICY "Owner can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_owner(auth.uid()));

-- Add RLS policies for owner to manage all user roles
CREATE POLICY "Owner can manage all roles"
ON public.user_roles
FOR ALL
USING (public.is_owner(auth.uid()));

-- Add RLS policy for owner to view all scraped videos
CREATE POLICY "Owner can view all scraped videos"
ON public.scraped_videos
FOR SELECT
USING (public.is_owner(auth.uid()));

-- Add RLS policy for owner to view all tiktok accounts
CREATE POLICY "Owner can view all tiktok accounts"
ON public.tiktok_accounts
FOR SELECT
USING (public.is_owner(auth.uid()));

-- Add RLS policy for owner to view all youtube channels
CREATE POLICY "Owner can view all youtube channels"
ON public.youtube_channels
FOR SELECT
USING (public.is_owner(auth.uid()));