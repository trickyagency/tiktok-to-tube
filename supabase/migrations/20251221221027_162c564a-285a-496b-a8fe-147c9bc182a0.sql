-- Reset any stuck 'scraping' status to 'pending' so users can retry
UPDATE tiktok_accounts 
SET scrape_status = 'pending', updated_at = now()
WHERE scrape_status = 'scraping';