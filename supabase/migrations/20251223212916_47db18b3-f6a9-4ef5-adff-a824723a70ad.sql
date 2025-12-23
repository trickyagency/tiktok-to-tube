-- Create cron job for schedule-processor (checks schedules and adds videos to queue)
SELECT cron.schedule(
  'schedule-processor-job',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://qpufyeeqosvgipslwday.supabase.co/functions/v1/schedule-processor',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwdWZ5ZWVxb3N2Z2lwc2x3ZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMzcwNTUsImV4cCI6MjA4MTkxMzA1NX0.KX9gwh1Q8qxlpqPHC4fitXURU45M0S8or7if36MaJpU"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);

-- Create cron job for process-queue (processes queued videos and uploads to YouTube)
SELECT cron.schedule(
  'process-queue-job',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://qpufyeeqosvgipslwday.supabase.co/functions/v1/process-queue',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwdWZ5ZWVxb3N2Z2lwc2x3ZGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMzcwNTUsImV4cCI6MjA4MTkxMzA1NX0.KX9gwh1Q8qxlpqPHC4fitXURU45M0S8or7if36MaJpU"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);