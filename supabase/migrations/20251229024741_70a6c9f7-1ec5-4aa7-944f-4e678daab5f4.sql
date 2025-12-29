-- Seed EMAIL_* platform settings with RepostFlow defaults
INSERT INTO platform_settings (key, value) VALUES
  ('EMAIL_PLATFORM_NAME', 'RepostFlow'),
  ('EMAIL_SENDER_NAME', 'RepostFlow'),
  ('EMAIL_SENDER_ADDRESS', 'onboarding@resend.dev'),
  ('EMAIL_LOGO_URL', ''),
  ('EMAIL_PRIMARY_COLOR', '#18181b'),
  ('EMAIL_ACCENT_COLOR', '#3b82f6')
ON CONFLICT (key) DO NOTHING;