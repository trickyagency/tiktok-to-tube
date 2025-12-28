-- Create scrape_queue table for bulk scraping with rate limiting
CREATE TABLE public.scrape_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tiktok_account_id UUID NOT NULL REFERENCES public.tiktok_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  videos_found INTEGER DEFAULT 0,
  videos_imported INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.scrape_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own scrape queue"
ON public.scrape_queue FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scrape queue"
ON public.scrape_queue FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scrape queue"
ON public.scrape_queue FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scrape queue"
ON public.scrape_queue FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all scrape queue"
ON public.scrape_queue FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner can view all scrape queue"
ON public.scrape_queue FOR SELECT
USING (is_owner(auth.uid()));

-- Indexes for efficient querying
CREATE INDEX idx_scrape_queue_status_scheduled ON public.scrape_queue(status, scheduled_at);
CREATE INDEX idx_scrape_queue_user_id ON public.scrape_queue(user_id);
CREATE INDEX idx_scrape_queue_account_id ON public.scrape_queue(tiktok_account_id);

-- Enable realtime for progress updates
ALTER TABLE public.scrape_queue REPLICA IDENTITY FULL;

-- Trigger for updated_at
CREATE TRIGGER update_scrape_queue_updated_at
BEFORE UPDATE ON public.scrape_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();