-- Add index for efficient health check scheduling
CREATE INDEX IF NOT EXISTS idx_channel_health_next_check 
ON channel_health(next_health_check_at) 
WHERE next_health_check_at IS NOT NULL;

-- Add index for status-based queries
CREATE INDEX IF NOT EXISTS idx_channel_health_status 
ON channel_health(status);

-- Create function to auto-set next_health_check_at based on status
CREATE OR REPLACE FUNCTION set_next_health_check()
RETURNS TRIGGER AS $$
BEGIN
  -- Set next health check based on status
  NEW.next_health_check_at := CASE
    WHEN NEW.status = 'healthy' THEN now() + interval '15 minutes'
    WHEN NEW.status = 'degraded' THEN now() + interval '5 minutes'
    WHEN NEW.status LIKE 'issues_%' THEN now() + interval '5 minutes'
    WHEN NEW.status = 'suspended' THEN now() + interval '24 hours'
    ELSE now() + interval '15 minutes'
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic next_health_check_at updates
DROP TRIGGER IF EXISTS trigger_set_next_health_check ON channel_health;
CREATE TRIGGER trigger_set_next_health_check
BEFORE INSERT OR UPDATE OF status ON channel_health
FOR EACH ROW
EXECUTE FUNCTION set_next_health_check();