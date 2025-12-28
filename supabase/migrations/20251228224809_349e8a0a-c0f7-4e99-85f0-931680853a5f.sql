-- Schedule daily subscription expiry check at midnight UTC
SELECT cron.schedule(
  'subscription-expiry-daily',
  '0 0 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://qpufyeeqosvgipslwday.supabase.co/functions/v1/subscription-expiry',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwdWZ5ZWVxb3N2Z2lwc2x3ZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMzcwNTUsImV4cCI6MjA4MTkxMzA1NX0.KX9gwh1Q8qxlpqPHC4fitXURU45M0S8or7if36MaJpU"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);