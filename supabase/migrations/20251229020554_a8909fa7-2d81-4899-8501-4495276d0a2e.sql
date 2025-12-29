-- Add notification_sent_at column to track when expiry warnings were sent
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP WITH TIME ZONE;

-- Add comment to explain the column
COMMENT ON COLUMN public.user_subscriptions.notification_sent_at IS 'Tracks when the expiry warning email was sent to prevent duplicate notifications';