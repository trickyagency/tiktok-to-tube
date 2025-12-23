-- First, reset the stuck account
UPDATE tiktok_accounts 
SET scrape_status = 'pending', 
    scrape_progress_current = 0, 
    scrape_progress_total = 0,
    updated_at = NOW()
WHERE scrape_status = 'scraping';

-- Create apify_runs table to track Apify actor runs
CREATE TABLE public.apify_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id TEXT NOT NULL UNIQUE,
  tiktok_account_id UUID NOT NULL REFERENCES public.tiktok_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  dataset_id TEXT,
  videos_imported INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.apify_runs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own apify runs"
ON public.apify_runs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own apify runs"
ON public.apify_runs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own apify runs"
ON public.apify_runs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Owner can view all apify runs"
ON public.apify_runs FOR SELECT
USING (is_owner(auth.uid()));

CREATE POLICY "Admins can manage all apify runs"
ON public.apify_runs FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for fast lookups
CREATE INDEX idx_apify_runs_run_id ON public.apify_runs(run_id);
CREATE INDEX idx_apify_runs_account_id ON public.apify_runs(tiktok_account_id);