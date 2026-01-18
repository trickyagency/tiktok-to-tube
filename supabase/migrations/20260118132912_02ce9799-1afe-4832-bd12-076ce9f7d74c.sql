-- Schedule the channel health cron job to run every 15 minutes
SELECT cron.schedule(
  'channel-health-check-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qpufyeeqosvgipslwday.supabase.co/functions/v1/channel-health-cron',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwdWZ5ZWVxb3N2Z2lwc2x3ZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMzcwNTUsImV4cCI6MjA4MTkxMzA1NX0.KX9gwh1Q8qxlpqPHC4fitXURU45M0S8or7if36MaJpU", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);