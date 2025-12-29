-- Add notification tracking columns for 3-day and 1-day reminders
ALTER TABLE user_subscriptions 
  ADD COLUMN IF NOT EXISTS notification_3day_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notification_1day_sent_at TIMESTAMPTZ;