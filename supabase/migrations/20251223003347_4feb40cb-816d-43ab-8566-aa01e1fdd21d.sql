-- Enable REPLICA IDENTITY FULL for realtime updates
ALTER TABLE tiktok_accounts REPLICA IDENTITY FULL;
ALTER TABLE scraped_videos REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE tiktok_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE scraped_videos;