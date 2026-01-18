-- Backfill channel_health records for existing YouTube channels
INSERT INTO channel_health (
  channel_id,
  channel_type,
  status,
  circuit_state,
  consecutive_failures,
  consecutive_successes,
  total_failures,
  total_successes,
  success_rate,
  created_at,
  updated_at,
  next_health_check_at
)
SELECT 
  yc.id as channel_id,
  'youtube' as channel_type,
  CASE 
    WHEN yc.auth_status = 'connected' THEN 'healthy'
    WHEN yc.auth_status = 'token_revoked' THEN 'issues_auth'
    WHEN yc.auth_status = 'api_not_enabled' THEN 'issues_config'
    WHEN yc.auth_status = 'failed' THEN 'issues_auth'
    WHEN yc.auth_status = 'quota_exceeded' THEN 'issues_quota'
    WHEN yc.auth_status = 'no_channel' THEN 'issues_config'
    ELSE 'healthy'
  END as status,
  'closed' as circuit_state,
  CASE WHEN yc.auth_status = 'connected' THEN 0 ELSE 1 END as consecutive_failures,
  CASE WHEN yc.auth_status = 'connected' THEN 1 ELSE 0 END as consecutive_successes,
  CASE WHEN yc.auth_status = 'connected' THEN 0 ELSE 1 END as total_failures,
  CASE WHEN yc.auth_status = 'connected' THEN 1 ELSE 0 END as total_successes,
  CASE WHEN yc.auth_status = 'connected' THEN 100.00 ELSE 0.00 END as success_rate,
  yc.created_at,
  now(),
  CASE 
    WHEN yc.auth_status = 'connected' THEN now() + interval '15 minutes'
    WHEN yc.auth_status IN ('token_revoked', 'api_not_enabled', 'failed') THEN now() + interval '5 minutes'
    ELSE now() + interval '24 hours'
  END as next_health_check_at
FROM youtube_channels yc
WHERE NOT EXISTS (
  SELECT 1 FROM channel_health ch WHERE ch.channel_id = yc.id
);