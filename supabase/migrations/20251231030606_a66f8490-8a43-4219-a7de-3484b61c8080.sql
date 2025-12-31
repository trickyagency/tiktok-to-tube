-- Add partial unique constraint to enforce one active schedule per YouTube channel per user
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_schedule_per_channel 
ON publish_schedules (youtube_channel_id, user_id) 
WHERE is_active = true;

-- Add a comment explaining the constraint
COMMENT ON INDEX unique_active_schedule_per_channel IS 
  'Ensures only one active schedule exists per YouTube channel per user';