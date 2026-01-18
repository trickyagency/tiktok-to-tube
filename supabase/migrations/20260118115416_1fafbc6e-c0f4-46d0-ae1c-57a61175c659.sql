-- =========================================
-- PHASE 1: Channel Health System Tables
-- =========================================

-- 1. Channel Health Table - Track health metrics per channel
CREATE TABLE public.channel_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.youtube_channels(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL DEFAULT 'youtube', -- 'youtube', 'tiktok', etc.
  
  -- Current status
  status TEXT NOT NULL DEFAULT 'healthy', -- healthy, degraded, issues_auth, issues_quota, issues_config, issues_permission, suspended
  previous_status TEXT,
  status_changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Health metrics
  consecutive_failures INTEGER DEFAULT 0,
  consecutive_successes INTEGER DEFAULT 0,
  total_failures INTEGER DEFAULT 0,
  total_successes INTEGER DEFAULT 0,
  success_rate NUMERIC(5,2) DEFAULT 100.00,
  
  -- Circuit breaker state
  circuit_state TEXT DEFAULT 'closed', -- closed, open, half_open
  circuit_opened_at TIMESTAMP WITH TIME ZONE,
  circuit_failure_count INTEGER DEFAULT 0,
  
  -- Retry tracking
  last_error_code TEXT,
  last_error_message TEXT,
  last_error_at TIMESTAMP WITH TIME ZONE,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,
  
  -- Health check timing
  last_health_check_at TIMESTAMP WITH TIME ZONE,
  next_health_check_at TIMESTAMP WITH TIME ZONE,
  
  -- Recovery tracking
  last_successful_operation_at TIMESTAMP WITH TIME ZONE,
  auto_recovery_attempts INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one health record per channel
CREATE UNIQUE INDEX idx_channel_health_channel ON public.channel_health(channel_id);

-- Index for finding unhealthy channels
CREATE INDEX idx_channel_health_status ON public.channel_health(status) WHERE status != 'healthy';

-- Index for circuit breaker checks
CREATE INDEX idx_channel_health_circuit ON public.channel_health(circuit_state) WHERE circuit_state != 'closed';

-- 2. Channel Errors Table - Detailed error logging with classification
CREATE TABLE public.channel_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.youtube_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Error classification
  error_code TEXT NOT NULL,
  error_category TEXT NOT NULL, -- AUTH, QUOTA, CONFIG, PERMISSION, RATE_LIMIT, PLATFORM_DOWN, NETWORK, UNKNOWN
  severity TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  
  -- Error details
  error_message TEXT NOT NULL,
  error_description TEXT,
  raw_error JSONB,
  
  -- Context
  operation TEXT, -- token_refresh, upload, api_call, health_check
  request_id TEXT,
  
  -- Classification result
  recommended_action TEXT, -- AUTO_RETRY, USER_REAUTH, USER_CONFIG, CONTACT_SUPPORT, WAIT_AND_RETRY
  is_retryable BOOLEAN DEFAULT false,
  
  -- Resolution
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by TEXT, -- auto, user, admin
  resolution_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for finding unresolved errors
CREATE INDEX idx_channel_errors_unresolved ON public.channel_errors(channel_id, is_resolved) WHERE is_resolved = false;

-- Index for error analytics
CREATE INDEX idx_channel_errors_category ON public.channel_errors(error_category, created_at);

-- Index for recent errors
CREATE INDEX idx_channel_errors_recent ON public.channel_errors(created_at DESC);

-- 3. Notification Log Table - Deduplication and delivery tracking
CREATE TABLE public.notification_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  channel_id UUID REFERENCES public.youtube_channels(id) ON DELETE SET NULL,
  
  -- Notification details
  notification_type TEXT NOT NULL, -- auth_revoked, quota_exceeded, api_disabled, health_degraded, daily_digest
  notification_key TEXT NOT NULL, -- Unique key for deduplication (channel_id + type + date)
  
  -- Content
  subject TEXT,
  error_code TEXT,
  error_category TEXT,
  severity TEXT,
  
  -- Delivery status
  delivery_status TEXT DEFAULT 'pending', -- pending, sent, failed, skipped
  sent_at TIMESTAMP WITH TIME ZONE,
  delivery_error TEXT,
  
  -- Deduplication
  cooldown_until TIMESTAMP WITH TIME ZONE,
  duplicate_count INTEGER DEFAULT 0,
  
  -- Rate limiting
  is_rate_limited BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for deduplication lookups
CREATE UNIQUE INDEX idx_notification_log_key ON public.notification_log(notification_key) WHERE delivery_status = 'sent';

-- Index for cooldown checks
CREATE INDEX idx_notification_log_cooldown ON public.notification_log(user_id, channel_id, notification_type, cooldown_until);

-- Index for rate limiting
CREATE INDEX idx_notification_log_rate_limit ON public.notification_log(user_id, sent_at) WHERE sent_at IS NOT NULL;

-- 4. Audit Log Table - Complete audit trail
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Actor
  user_id UUID,
  actor_type TEXT NOT NULL DEFAULT 'user', -- user, system, admin, cron
  
  -- Target
  entity_type TEXT NOT NULL, -- youtube_channel, tiktok_account, credentials, subscription
  entity_id UUID NOT NULL,
  
  -- Action
  action TEXT NOT NULL, -- credentials_updated, reauthorized, status_changed, token_refreshed, circuit_opened, etc.
  
  -- Details
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,
  
  -- Context
  request_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  
  -- Result
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for entity history
CREATE INDEX idx_audit_log_entity ON public.audit_log(entity_type, entity_id, created_at DESC);

-- Index for user activity
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- Index for recent audits
CREATE INDEX idx_audit_log_recent ON public.audit_log(created_at DESC);

-- 5. Add new columns to youtube_channels for enhanced status tracking
ALTER TABLE public.youtube_channels 
ADD COLUMN IF NOT EXISTS auth_error_code TEXT,
ADD COLUMN IF NOT EXISTS auth_error_message TEXT,
ADD COLUMN IF NOT EXISTS auth_error_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_health_check_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS health_check_failures INTEGER DEFAULT 0;

-- =========================================
-- Row Level Security Policies
-- =========================================

-- Enable RLS on all new tables
ALTER TABLE public.channel_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- channel_health policies
CREATE POLICY "Users can view health of their own channels" 
ON public.channel_health FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM youtube_channels 
    WHERE youtube_channels.id = channel_health.channel_id 
    AND youtube_channels.user_id = auth.uid()
  )
);

CREATE POLICY "Owner can view all channel health" 
ON public.channel_health FOR SELECT 
USING (is_owner(auth.uid()));

CREATE POLICY "Admins can manage all channel health" 
ON public.channel_health FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- channel_errors policies
CREATE POLICY "Users can view errors for their own channels" 
ON public.channel_errors FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Owner can view all channel errors" 
ON public.channel_errors FOR SELECT 
USING (is_owner(auth.uid()));

CREATE POLICY "Admins can manage all channel errors" 
ON public.channel_errors FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- notification_log policies
CREATE POLICY "Users can view their own notifications" 
ON public.notification_log FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Owner can view all notifications" 
ON public.notification_log FOR SELECT 
USING (is_owner(auth.uid()));

CREATE POLICY "Admins can manage all notifications" 
ON public.notification_log FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- audit_log policies (read-only for users, full access for admins)
CREATE POLICY "Users can view audits for their own actions" 
ON public.audit_log FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Owner can view all audits" 
ON public.audit_log FOR SELECT 
USING (is_owner(auth.uid()));

CREATE POLICY "Admins can manage all audits" 
ON public.audit_log FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- =========================================
-- Trigger for updated_at on channel_health
-- =========================================
CREATE TRIGGER update_channel_health_updated_at
BEFORE UPDATE ON public.channel_health
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();