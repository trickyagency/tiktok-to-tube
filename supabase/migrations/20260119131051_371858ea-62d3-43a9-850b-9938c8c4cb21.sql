-- ============================================
-- DATABASE CLEANUP - PHASES 1 & 2
-- Estimated savings: ~315 MB
-- ============================================

-- STEP 1: Truncate HTTP Response Cache (~244 MB savings)
-- These are temporary pg_net responses, completely safe to delete
TRUNCATE TABLE net._http_response;

-- STEP 2: Delete Old Cron History (~70 MB savings)
-- Keep only last 7 days for debugging
DELETE FROM cron.job_run_details 
WHERE start_time < now() - interval '7 days';

-- STEP 3: Create Archive Table for Failed Queue Items
CREATE TABLE IF NOT EXISTS public.publish_queue_archive (
  id uuid PRIMARY KEY,
  scraped_video_id uuid,
  youtube_channel_id uuid,
  user_id uuid,
  error_message text,
  retry_count integer,
  original_created_at timestamptz,
  archived_at timestamptz DEFAULT now()
);

-- Enable RLS on archive table
ALTER TABLE public.publish_queue_archive ENABLE ROW LEVEL SECURITY;

-- Owner can view all archived items
CREATE POLICY "Owners can view all archived queue items"
  ON public.publish_queue_archive
  FOR SELECT
  USING (public.is_owner(auth.uid()));

-- STEP 4: Archive Failed Queue Items (older than 14 days with exhausted retries)
INSERT INTO public.publish_queue_archive (id, scraped_video_id, youtube_channel_id, user_id, error_message, retry_count, original_created_at)
SELECT id, scraped_video_id, youtube_channel_id, user_id, error_message, retry_count, created_at
FROM public.publish_queue
WHERE status = 'failed'
  AND COALESCE(retry_count, 0) >= COALESCE(max_retries, 3)
  AND created_at < now() - interval '14 days'
ON CONFLICT (id) DO NOTHING;

-- Delete archived failed items from main queue
DELETE FROM public.publish_queue
WHERE status = 'failed'
  AND COALESCE(retry_count, 0) >= COALESCE(max_retries, 3)
  AND created_at < now() - interval '14 days';

-- Delete old published items (older than 30 days)
DELETE FROM public.publish_queue
WHERE status = 'published'
  AND processed_at < now() - interval '30 days';

-- STEP 5: Delete Old Upload Logs (older than 30 days)
DELETE FROM public.upload_logs
WHERE created_at < now() - interval '30 days';

-- STEP 6: Delete Completed Scrape Queue Items (older than 7 days)
DELETE FROM public.scrape_queue
WHERE status = 'completed'
  AND completed_at < now() - interval '7 days';

-- STEP 7: Clean Old Apify Runs
-- Delete completed runs older than 30 days
DELETE FROM public.apify_runs
WHERE status = 'completed'
  AND completed_at < now() - interval '30 days';

-- Mark stuck "running" runs older than 1 day as failed
UPDATE public.apify_runs
SET status = 'failed', 
    error_message = 'Timed out - marked as failed during cleanup'
WHERE status = 'running'
  AND created_at < now() - interval '1 day';

-- ============================================
-- AUTOMATED CLEANUP CRON JOBS
-- Prevent future bloat with daily cleanup
-- ============================================

-- Job 1: Clean HTTP Response Cache (daily at 4:00 AM UTC)
SELECT cron.schedule(
  'cleanup-http-responses',
  '0 4 * * *',
  $$DELETE FROM net._http_response WHERE created < now() - interval '1 day'$$
);

-- Job 2: Clean Cron History (daily at 4:10 AM UTC)
SELECT cron.schedule(
  'cleanup-cron-history',
  '10 4 * * *',
  $$DELETE FROM cron.job_run_details WHERE start_time < now() - interval '7 days'$$
);

-- Job 3: Clean Old Published Queue Items (daily at 4:20 AM UTC)
SELECT cron.schedule(
  'cleanup-old-queue-items',
  '20 4 * * *',
  $$DELETE FROM public.publish_queue WHERE status = 'published' AND processed_at < now() - interval '30 days'$$
);

-- Job 4: Clean Old Upload Logs (daily at 4:30 AM UTC)
SELECT cron.schedule(
  'cleanup-upload-logs',
  '30 4 * * *',
  $$DELETE FROM public.upload_logs WHERE created_at < now() - interval '30 days'$$
);

-- Job 5: Clean Completed Scrape Queue (daily at 4:40 AM UTC)
SELECT cron.schedule(
  'cleanup-scrape-queue',
  '40 4 * * *',
  $$DELETE FROM public.scrape_queue WHERE status = 'completed' AND completed_at < now() - interval '7 days'$$
);