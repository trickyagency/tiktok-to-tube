-- Make channel_id nullable to allow OAuth completion even when no YouTube channel exists
ALTER TABLE youtube_channels 
ALTER COLUMN channel_id DROP NOT NULL;

-- Set a default value for new rows
ALTER TABLE youtube_channels 
ALTER COLUMN channel_id SET DEFAULT '';