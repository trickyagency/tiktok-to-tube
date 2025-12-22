-- Create function to get cron jobs (SECURITY DEFINER to access cron schema)
CREATE OR REPLACE FUNCTION public.get_cron_jobs()
RETURNS TABLE (
  jobid bigint,
  jobname text,
  schedule text,
  command text,
  active boolean
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jobid, jobname, schedule, command, active 
  FROM cron.job
  ORDER BY jobid;
$$;

-- Create function to get cron job execution history
CREATE OR REPLACE FUNCTION public.get_cron_history(limit_rows int DEFAULT 50)
RETURNS TABLE (
  runid bigint,
  jobid bigint,
  job_name text,
  status text,
  return_message text,
  start_time timestamptz,
  end_time timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    d.runid, 
    d.jobid, 
    j.jobname as job_name,
    d.status, 
    d.return_message, 
    d.start_time, 
    d.end_time
  FROM cron.job_run_details d
  LEFT JOIN cron.job j ON d.jobid = j.jobid
  ORDER BY d.start_time DESC
  LIMIT limit_rows;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_cron_jobs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cron_history(int) TO authenticated;