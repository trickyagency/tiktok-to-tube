-- Create user_limits table to store per-user account/channel limits
CREATE TABLE public.user_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  max_tiktok_accounts INTEGER NOT NULL DEFAULT 5,
  max_youtube_channels INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_limits ENABLE ROW LEVEL SECURITY;

-- Owners can manage all user limits
CREATE POLICY "Owner can manage all user limits" ON public.user_limits
  FOR ALL USING (is_owner(auth.uid()));

-- Users can view their own limits
CREATE POLICY "Users can view their own limits" ON public.user_limits
  FOR SELECT USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_limits_updated_at
  BEFORE UPDATE ON public.user_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for user_limits
ALTER TABLE public.user_limits REPLICA IDENTITY FULL;