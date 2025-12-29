INSERT INTO platform_settings (key, value) VALUES 
  ('EMAIL_SENDER_ADDRESS', 'notifications@repostflow.digitalautomators.com'),
  ('EMAIL_SENDER_NAME', 'RepostFlow')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();