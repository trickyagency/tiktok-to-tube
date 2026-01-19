-- P0-1: Add concurrent processing lock to prevent duplicate uploads
-- P0-3: Add idempotency constraints for queue items

-- Add processor_id column for tracking which processor claimed the item
ALTER TABLE publish_queue ADD COLUMN IF NOT EXISTS processor_id text;
ALTER TABLE publish_queue ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

-- Create atomic claim function that prevents race conditions
CREATE OR REPLACE FUNCTION public.claim_queue_item(p_item_id uuid, p_processor_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE publish_queue
  SET 
    status = 'processing',
    started_at = COALESCE(started_at, now()),
    claimed_at = now(),
    processor_id = p_processor_id,
    updated_at = now()
  WHERE id = p_item_id
    AND status = 'queued';
  RETURN FOUND;
END;
$$;

-- Create function to release stale claims (items stuck in processing > 10 minutes)
CREATE OR REPLACE FUNCTION public.release_stale_claims(p_minutes integer DEFAULT 10)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  released_count integer;
BEGIN
  UPDATE publish_queue
  SET 
    status = 'queued',
    processor_id = NULL,
    claimed_at = NULL,
    retry_count = COALESCE(retry_count, 0) + 1,
    updated_at = now()
  WHERE status = 'processing'
    AND claimed_at < now() - (p_minutes || ' minutes')::interval
    AND COALESCE(retry_count, 0) < COALESCE(max_retries, 3);
  
  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count;
END;
$$;

-- P0-3: Add unique constraint to prevent duplicate queue entries for same video+channel while active
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_queue_item 
ON publish_queue (scraped_video_id, youtube_channel_id) 
WHERE status IN ('queued', 'processing');

-- Add idempotency_key column for external deduplication
ALTER TABLE publish_queue ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS unique_idempotency_key 
ON publish_queue (idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Add index to speed up queue item fetching
CREATE INDEX IF NOT EXISTS idx_publish_queue_status_scheduled 
ON publish_queue (status, scheduled_for) 
WHERE status = 'queued';

-- Add index for stale claim detection
CREATE INDEX IF NOT EXISTS idx_publish_queue_stale_claims 
ON publish_queue (status, claimed_at) 
WHERE status = 'processing';