-- Add channel_handle column to store YouTube channel username/handle
ALTER TABLE youtube_channels 
ADD COLUMN channel_handle text;