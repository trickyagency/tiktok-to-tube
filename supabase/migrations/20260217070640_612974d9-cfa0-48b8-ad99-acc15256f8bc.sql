
-- Fix currently stuck items
UPDATE scrape_queue 
SET status = 'failed', error_message = 'Stuck in processing - auto-cleared'
WHERE status = 'processing' AND started_at < now() - interval '30 minutes';

-- Update cron job to include stale processing cleanup
SELECT cron.unschedule('cleanup-scrape-queue');
SELECT cron.schedule(
  'cleanup-scrape-queue',
  '40 4 * * *',
  $$
    DELETE FROM scrape_queue WHERE status = 'completed' AND completed_at < now() - interval '7 days';
    UPDATE scrape_queue SET status = 'failed', error_message = 'Stuck in processing - auto-cleared' WHERE status = 'processing' AND started_at < now() - interval '30 minutes';
    DELETE FROM scrape_queue WHERE status = 'failed' AND updated_at < now() - interval '7 days';
  $$
);
