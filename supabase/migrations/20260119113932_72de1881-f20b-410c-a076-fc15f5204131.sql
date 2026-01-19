-- Add published_via column to track how videos were marked as published
-- Values: null = not published, 'automated' = via platform upload, 'manual' = user marked as already published
ALTER TABLE scraped_videos
ADD COLUMN IF NOT EXISTS published_via TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN scraped_videos.published_via IS 'How the video was published: automated (via platform), manual (user marked externally), or null (not published)';

-- Update existing published videos to have published_via = 'automated'
UPDATE scraped_videos 
SET published_via = 'automated' 
WHERE is_published = true AND published_via IS NULL;