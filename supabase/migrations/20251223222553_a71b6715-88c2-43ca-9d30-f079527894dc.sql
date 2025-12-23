-- Create youtube_quota_usage table for tracking daily API quota usage
CREATE TABLE public.youtube_quota_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_channel_id UUID NOT NULL REFERENCES youtube_channels(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  uploads_count INTEGER NOT NULL DEFAULT 0,
  quota_used INTEGER NOT NULL DEFAULT 0,
  quota_limit INTEGER NOT NULL DEFAULT 10000,
  is_paused BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(youtube_channel_id, date)
);

-- Enable RLS
ALTER TABLE public.youtube_quota_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own quota usage"
  ON public.youtube_quota_usage FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM youtube_channels 
    WHERE youtube_channels.id = youtube_quota_usage.youtube_channel_id 
    AND youtube_channels.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all quota usage"
  ON public.youtube_quota_usage FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner can view all quota usage"
  ON public.youtube_quota_usage FOR SELECT
  USING (is_owner(auth.uid()));

-- Create function to increment quota usage atomically
CREATE OR REPLACE FUNCTION public.increment_quota_usage(
  p_channel_id UUID,
  p_date DATE,
  p_quota_cost INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO youtube_quota_usage (youtube_channel_id, date, uploads_count, quota_used)
  VALUES (p_channel_id, p_date, 1, p_quota_cost)
  ON CONFLICT (youtube_channel_id, date)
  DO UPDATE SET 
    uploads_count = youtube_quota_usage.uploads_count + 1,
    quota_used = youtube_quota_usage.quota_used + p_quota_cost,
    updated_at = NOW();
END;
$$;

-- Create function to check if quota is available
CREATE OR REPLACE FUNCTION public.check_quota_available(
  p_channel_id UUID,
  p_quota_cost INTEGER DEFAULT 1600
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- If no record exists for today, quota is available
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;

  -- If paused, not available
  IF v_is_paused THEN
    RETURN FALSE;
  END IF;

  -- Check if enough quota remains
  RETURN (v_quota_limit - v_quota_used) >= p_quota_cost;
END;
$$;

-- Create trigger to update updated_at
CREATE TRIGGER update_youtube_quota_usage_updated_at
  BEFORE UPDATE ON public.youtube_quota_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();