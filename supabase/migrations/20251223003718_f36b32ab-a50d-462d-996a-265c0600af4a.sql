-- Add progress tracking columns to tiktok_accounts
ALTER TABLE tiktok_accounts 
ADD COLUMN IF NOT EXISTS scrape_progress_current integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS scrape_progress_total integer DEFAULT 0;