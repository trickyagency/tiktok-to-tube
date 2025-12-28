-- Change default limits to 1 for new users
ALTER TABLE user_limits 
  ALTER COLUMN max_tiktok_accounts SET DEFAULT 1,
  ALTER COLUMN max_youtube_channels SET DEFAULT 1;