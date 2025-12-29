-- Add YouTube description and tags columns to tiktok_accounts
ALTER TABLE public.tiktok_accounts 
ADD COLUMN youtube_description TEXT DEFAULT NULL,
ADD COLUMN youtube_tags TEXT DEFAULT NULL;