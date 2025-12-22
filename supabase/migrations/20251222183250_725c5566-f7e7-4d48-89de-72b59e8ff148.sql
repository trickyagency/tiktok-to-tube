-- Add per-channel Google OAuth credentials columns to youtube_channels
ALTER TABLE public.youtube_channels
ADD COLUMN IF NOT EXISTS google_client_id text,
ADD COLUMN IF NOT EXISTS google_client_secret text,
ADD COLUMN IF NOT EXISTS google_redirect_uri text,
ADD COLUMN IF NOT EXISTS auth_status text DEFAULT 'pending';

-- Add comment for documentation
COMMENT ON COLUMN public.youtube_channels.google_client_id IS 'Google Cloud project OAuth Client ID for this specific channel';
COMMENT ON COLUMN public.youtube_channels.google_client_secret IS 'Google Cloud project OAuth Client Secret for this specific channel';
COMMENT ON COLUMN public.youtube_channels.google_redirect_uri IS 'Optional custom redirect URI for OAuth callback';
COMMENT ON COLUMN public.youtube_channels.auth_status IS 'OAuth authorization status: pending, authorizing, connected, failed';