-- Add correlation_id to channel_errors table
ALTER TABLE public.channel_errors 
ADD COLUMN IF NOT EXISTS correlation_id TEXT;

-- Add correlation_id to notification_log table
ALTER TABLE public.notification_log 
ADD COLUMN IF NOT EXISTS correlation_id TEXT;

-- Add index for correlation lookups on channel_errors
CREATE INDEX IF NOT EXISTS idx_channel_errors_correlation 
ON public.channel_errors(correlation_id) 
WHERE correlation_id IS NOT NULL;

-- Add index for correlation lookups on notification_log
CREATE INDEX IF NOT EXISTS idx_notification_log_correlation 
ON public.notification_log(correlation_id) 
WHERE correlation_id IS NOT NULL;

-- Add index for user rate limiting on notification_log
CREATE INDEX IF NOT EXISTS idx_notification_log_user_rate_limit
ON public.notification_log(user_id, sent_at DESC)
WHERE sent_at IS NOT NULL;