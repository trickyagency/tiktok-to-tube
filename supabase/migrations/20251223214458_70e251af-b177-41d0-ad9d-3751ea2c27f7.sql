-- Add started_at column for accurate timeout detection
ALTER TABLE publish_queue ADD COLUMN IF NOT EXISTS started_at timestamptz;

-- Fix the current stuck item with its successful YouTube URL (using 'published' status)
UPDATE publish_queue 
SET status = 'published',
    youtube_video_id = 'LtEj-FXWTEo',
    youtube_video_url = 'https://www.youtube.com/watch?v=LtEj-FXWTEo',
    processed_at = '2025-12-23T21:40:05Z',
    progress_phase = NULL,
    progress_percentage = 100,
    started_at = NULL
WHERE id = 'a86440d3-783b-46c9-9fab-3359e5226904';