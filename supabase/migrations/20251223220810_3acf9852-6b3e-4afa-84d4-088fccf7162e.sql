-- Create upload_logs table for detailed upload history
CREATE TABLE public.upload_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  queue_item_id UUID REFERENCES publish_queue(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  youtube_channel_id UUID REFERENCES youtube_channels(id) ON DELETE SET NULL,
  scraped_video_id UUID REFERENCES scraped_videos(id) ON DELETE SET NULL,
  
  -- Attempt tracking
  attempt_number INTEGER DEFAULT 1,
  
  -- Timing metrics
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Phase-level timing (in milliseconds)
  download_duration_ms INTEGER,
  token_refresh_duration_ms INTEGER,
  upload_duration_ms INTEGER,
  finalize_duration_ms INTEGER,
  total_duration_ms INTEGER,
  
  -- Size metrics
  video_size_bytes BIGINT,
  
  -- Result
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'success', 'failed')),
  
  -- Error details
  error_phase TEXT,
  error_message TEXT,
  error_code TEXT,
  
  -- Output
  youtube_video_id TEXT,
  youtube_video_url TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_upload_logs_queue_item ON upload_logs(queue_item_id);
CREATE INDEX idx_upload_logs_user ON upload_logs(user_id);
CREATE INDEX idx_upload_logs_channel ON upload_logs(youtube_channel_id);
CREATE INDEX idx_upload_logs_status ON upload_logs(status);
CREATE INDEX idx_upload_logs_started_at ON upload_logs(started_at DESC);

-- RLS Policies
ALTER TABLE upload_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own upload logs"
  ON upload_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all upload logs"
  ON upload_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner can view all upload logs"
  ON upload_logs FOR SELECT
  USING (is_owner(auth.uid()));

-- Enable realtime for live log updates
ALTER PUBLICATION supabase_realtime ADD TABLE upload_logs;