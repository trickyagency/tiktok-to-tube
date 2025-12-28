-- Create cron job for scrape queue processor (runs every 2 minutes)
SELECT cron.schedule(
  'scrape-queue-processor-job',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url:='https://qpufyeeqosvgipslwday.supabase.co/functions/v1/scrape-queue-processor',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwdWZ5ZWVxb3N2Z2lwc2x3ZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMzcwNTUsImV4cCI6MjA4MTkxMzA1NX0.KX9gwh1Q8qxlpqPHC4fitXURU45M0S8or7if36MaJpU"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);