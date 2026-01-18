import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// =========================================
// Error Classification (inline for edge function)
// =========================================

type ErrorCategory = 'AUTH' | 'QUOTA' | 'CONFIG' | 'PERMISSION' | 'RATE_LIMIT' | 'PLATFORM_DOWN' | 'NETWORK' | 'UNKNOWN';
type Severity = 'low' | 'medium' | 'high' | 'critical';
type RecommendedAction = 'AUTO_RETRY' | 'USER_REAUTH' | 'USER_CONFIG' | 'CONTACT_SUPPORT' | 'WAIT_AND_RETRY';

interface ClassifiedError {
  code: string;
  category: ErrorCategory;
  severity: Severity;
  recommendedAction: RecommendedAction;
  isRetryable: boolean;
  retryDelayMs: number;
  maxRetries: number;
  userMessage: string;
  technicalMessage: string;
}

interface ErrorInput {
  code?: string;
  message?: string;
  status?: number;
  description?: string;
}

const GOOGLE_ERROR_MAP: Record<string, Omit<ClassifiedError, 'code' | 'technicalMessage'>> = {
  'invalid_grant': {
    category: 'AUTH',
    severity: 'critical',
    recommendedAction: 'USER_REAUTH',
    isRetryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    userMessage: 'Your authorization has expired or was revoked. Please re-authorize your channel.',
  },
  'invalid_client': {
    category: 'CONFIG',
    severity: 'critical',
    recommendedAction: 'USER_CONFIG',
    isRetryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    userMessage: 'OAuth credentials are invalid. Please check your Client ID and Secret.',
  },
  'access_denied': {
    category: 'AUTH',
    severity: 'high',
    recommendedAction: 'USER_REAUTH',
    isRetryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    userMessage: 'Access was denied. Please re-authorize and grant the required permissions.',
  },
  'accessNotConfigured': {
    category: 'CONFIG',
    severity: 'critical',
    recommendedAction: 'USER_CONFIG',
    isRetryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    userMessage: 'YouTube Data API v3 is not enabled. Enable it in your Google Cloud Console.',
  },
  'quotaExceeded': {
    category: 'QUOTA',
    severity: 'medium',
    recommendedAction: 'WAIT_AND_RETRY',
    isRetryable: true,
    retryDelayMs: 3600000,
    maxRetries: 1,
    userMessage: 'YouTube API quota exceeded. Uploads will resume when quota resets.',
  },
  'insufficientPermissions': {
    category: 'PERMISSION',
    severity: 'high',
    recommendedAction: 'USER_REAUTH',
    isRetryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    userMessage: 'Insufficient permissions. Please re-authorize with all required scopes.',
  },
};

function classifyError(input: ErrorInput): ClassifiedError {
  const code = input.code || '';
  const message = input.message || '';
  const description = input.description || '';
  const combinedText = `${code} ${message} ${description}`.toLowerCase();
  
  // Check for exact Google error code match
  if (code && GOOGLE_ERROR_MAP[code]) {
    return { code, technicalMessage: message || code, ...GOOGLE_ERROR_MAP[code] };
  }
  
  // Check for known error patterns
  for (const [errorCode, mapping] of Object.entries(GOOGLE_ERROR_MAP)) {
    if (combinedText.includes(errorCode.toLowerCase())) {
      return { code: errorCode, technicalMessage: message || errorCode, ...mapping };
    }
  }
  
  // Check for API not enabled patterns
  if (combinedText.includes('youtube data api') || combinedText.includes('has not been used') || combinedText.includes('it is disabled')) {
    return { code: 'accessNotConfigured', technicalMessage: message || description, ...GOOGLE_ERROR_MAP['accessNotConfigured'] };
  }
  
  // Check for quota patterns
  if (combinedText.includes('quota') || combinedText.includes('limit exceeded')) {
    return { code: 'quotaExceeded', technicalMessage: message || description, ...GOOGLE_ERROR_MAP['quotaExceeded'] };
  }
  
  // Network errors
  if (combinedText.includes('network') || combinedText.includes('timeout') || combinedText.includes('connection')) {
    return {
      code: 'network_error',
      category: 'NETWORK',
      severity: 'medium',
      recommendedAction: 'AUTO_RETRY',
      isRetryable: true,
      retryDelayMs: 5000,
      maxRetries: 3,
      userMessage: 'Network error occurred. Will retry automatically.',
      technicalMessage: message || 'Network connection failed',
    };
  }
  
  // HTTP status based
  if (input.status) {
    if (input.status === 401) {
      return {
        code: 'HTTP_401',
        category: 'AUTH',
        severity: 'critical',
        recommendedAction: 'USER_REAUTH',
        isRetryable: false,
        retryDelayMs: 0,
        maxRetries: 0,
        userMessage: 'Authentication required. Please re-authorize your channel.',
        technicalMessage: message || 'HTTP 401 Unauthorized',
      };
    }
    if (input.status === 403) {
      return {
        code: 'HTTP_403',
        category: 'PERMISSION',
        severity: 'high',
        recommendedAction: 'USER_REAUTH',
        isRetryable: false,
        retryDelayMs: 0,
        maxRetries: 0,
        userMessage: 'Access denied. You may need to grant additional permissions.',
        technicalMessage: message || 'HTTP 403 Forbidden',
      };
    }
    if (input.status === 429) {
      return {
        code: 'HTTP_429',
        category: 'RATE_LIMIT',
        severity: 'low',
        recommendedAction: 'AUTO_RETRY',
        isRetryable: true,
        retryDelayMs: 60000,
        maxRetries: 5,
        userMessage: 'Rate limit exceeded. Will retry automatically.',
        technicalMessage: message || 'HTTP 429 Too Many Requests',
      };
    }
    if (input.status >= 500) {
      return {
        code: `HTTP_${input.status}`,
        category: 'PLATFORM_DOWN',
        severity: 'medium',
        recommendedAction: 'AUTO_RETRY',
        isRetryable: true,
        retryDelayMs: 30000,
        maxRetries: 3,
        userMessage: 'Server error occurred. Will retry automatically.',
        technicalMessage: message || `HTTP ${input.status} Server Error`,
      };
    }
  }
  
  return {
    code: code || 'unknown_error',
    category: 'UNKNOWN',
    severity: 'medium',
    recommendedAction: 'CONTACT_SUPPORT',
    isRetryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    userMessage: 'An unexpected error occurred. Please try again or contact support.',
    technicalMessage: message || description || 'Unknown error',
  };
}

function getChannelStatusFromError(category: ErrorCategory): string {
  switch (category) {
    case 'AUTH': return 'issues_auth';
    case 'QUOTA': return 'issues_quota';
    case 'CONFIG': return 'issues_config';
    case 'PERMISSION': return 'issues_permission';
    case 'RATE_LIMIT':
    case 'PLATFORM_DOWN':
    case 'NETWORK': return 'degraded';
    default: return 'issues_auth';
  }
}

function getAuthStatusFromError(category: ErrorCategory, code: string): string {
  switch (category) {
    case 'AUTH': return 'token_revoked';
    case 'CONFIG': return code === 'accessNotConfigured' ? 'api_not_enabled' : 'failed';
    case 'QUOTA': return 'quota_exceeded';
    case 'PERMISSION': return 'permission_denied';
    case 'RATE_LIMIT': return 'quota_exceeded'; // Rate limit often indicates quota issues
    default: return 'failed';
  }
}

// =========================================
// Circuit Breaker Configuration
// =========================================

const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,        // Open circuit after 5 consecutive failures
  successThreshold: 2,        // Close circuit after 2 consecutive successes in half-open
  halfOpenDelay: 5 * 60 * 1000, // Try half-open after 5 minutes
  suspendThreshold: 5,        // Suspend channel after 5 failures (for non-auth/config issues)
};

// =========================================
// Notification Deduplication with SHA-256
// =========================================

async function createNotificationHash(channelId: string, errorCode: string, severity: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${channelId}:${errorCode}:${severity}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

// =========================================
// State Transition Rules
// =========================================

const STATE_TRANSITIONS: Record<string, Record<string, string | ((failures: number) => string)>> = {
  healthy: {
    AUTH: 'issues_auth',
    QUOTA: 'issues_quota',
    CONFIG: 'issues_config',
    PERMISSION: 'issues_permission',
    RATE_LIMIT: 'degraded',
    PLATFORM_DOWN: 'degraded',
    NETWORK: 'degraded',
  },
  connected: {
    AUTH: 'issues_auth',
    QUOTA: 'degraded',
    CONFIG: 'issues_config',
    PERMISSION: 'issues_permission',
    RATE_LIMIT: 'degraded',
    PLATFORM_DOWN: 'degraded',
  },
  degraded: {
    success: 'healthy',
    repeated_failure: (failures: number) => failures >= CIRCUIT_BREAKER_CONFIG.suspendThreshold ? 'suspended' : 'degraded',
  },
  issues_auth: {
    success: 'healthy',
    repeated_failure: (failures: number) => failures >= CIRCUIT_BREAKER_CONFIG.suspendThreshold ? 'suspended' : 'issues_auth',
  },
  issues_quota: {
    success: 'healthy',
    quota_reset: 'healthy',
  },
  issues_config: {
    success: 'healthy',
  },
  issues_permission: {
    success: 'healthy',
    repeated_failure: (failures: number) => failures >= CIRCUIT_BREAKER_CONFIG.suspendThreshold ? 'suspended' : 'issues_permission',
  },
  suspended: {
    success: 'healthy', // Only way out is success (user re-auth)
  },
  reauthorizing: {
    success: 'healthy',
    failure: 'issues_auth',
  },
};

// =========================================
// Health Engine Actions
// =========================================

interface RecordFailureRequest {
  action: 'record_failure';
  channelId: string;
  userId: string;
  error: ErrorInput;
  operation?: string;
  requestId?: string;
}

interface RecordSuccessRequest {
  action: 'record_success';
  channelId: string;
  operation?: string;
}

interface CheckHealthRequest {
  action: 'check_health';
  channelId: string;
}

interface GetHealthRequest {
  action: 'get_health';
  channelId: string;
}

type HealthEngineRequest = RecordFailureRequest | RecordSuccessRequest | CheckHealthRequest | GetHealthRequest;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();

  console.log(JSON.stringify({
    requestId,
    level: 'info',
    message: 'Channel health engine request received',
    timestamp: new Date().toISOString(),
  }));

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: HealthEngineRequest = await req.json();

    // =========================================
    // ACTION: record_failure
    // =========================================
    if (body.action === 'record_failure') {
      const { channelId, userId, error, operation } = body as RecordFailureRequest;
      
      console.log(JSON.stringify({
        requestId,
        level: 'info',
        message: 'Recording failure',
        channelId: channelId.slice(0, 8),
        operation,
        elapsed: Date.now() - startTime,
      }));
      
      // Classify the error
      const classifiedError = classifyError(error);
      
      // Get or create health record
      let { data: health, error: healthError } = await supabase
        .from('channel_health')
        .select('*')
        .eq('channel_id', channelId)
        .single();
      
      if (healthError || !health) {
        // Create new health record
        const { data: newHealth, error: insertError } = await supabase
          .from('channel_health')
          .insert({
            channel_id: channelId,
            channel_type: 'youtube',
            status: 'healthy',
          })
          .select()
          .single();
        
        if (insertError) {
          throw new Error(`Failed to create health record: ${insertError.message}`);
        }
        health = newHealth;
      }
      
      // Calculate new metrics
      const newConsecutiveFailures = health.consecutive_failures + 1;
      const newTotalFailures = health.total_failures + 1;
      const totalOperations = health.total_successes + newTotalFailures;
      const newSuccessRate = totalOperations > 0 
        ? ((health.total_successes / totalOperations) * 100).toFixed(2) 
        : '0.00';
      
      // Determine circuit breaker state
      let newCircuitState = health.circuit_state;
      let circuitOpenedAt = health.circuit_opened_at;
      
      if (newConsecutiveFailures >= CIRCUIT_BREAKER_CONFIG.failureThreshold && health.circuit_state === 'closed') {
        newCircuitState = 'open';
        circuitOpenedAt = new Date().toISOString();
        console.log(JSON.stringify({
          requestId,
          level: 'warn',
          message: 'Circuit breaker opened',
          channelId: channelId.slice(0, 8),
          consecutiveFailures: newConsecutiveFailures,
        }));
      }
      
      // Determine channel status
      const previousStatus = health.status;
      const newStatus = getChannelStatusFromError(classifiedError.category);
      
      // Calculate next retry time
      const nextRetryAt = classifiedError.isRetryable && health.retry_count < classifiedError.maxRetries
        ? new Date(Date.now() + classifiedError.retryDelayMs * Math.pow(2, health.retry_count)).toISOString()
        : null;
      
      // Update health record
      await supabase
        .from('channel_health')
        .update({
          status: newStatus,
          previous_status: previousStatus !== newStatus ? previousStatus : health.previous_status,
          status_changed_at: previousStatus !== newStatus ? new Date().toISOString() : health.status_changed_at,
          consecutive_failures: newConsecutiveFailures,
          consecutive_successes: 0,
          total_failures: newTotalFailures,
          success_rate: parseFloat(newSuccessRate),
          circuit_state: newCircuitState,
          circuit_opened_at: circuitOpenedAt,
          circuit_failure_count: newCircuitState === 'open' ? health.circuit_failure_count + 1 : health.circuit_failure_count,
          last_error_code: classifiedError.code,
          last_error_message: classifiedError.userMessage,
          last_error_at: new Date().toISOString(),
          next_retry_at: nextRetryAt,
          retry_count: classifiedError.isRetryable ? health.retry_count + 1 : 0,
          last_health_check_at: new Date().toISOString(),
        })
        .eq('id', health.id);
      
      // Update youtube_channels table
      await supabase
        .from('youtube_channels')
        .update({
          auth_status: getAuthStatusFromError(classifiedError.category, classifiedError.code),
          is_connected: false,
          auth_error_code: classifiedError.code,
          auth_error_message: classifiedError.userMessage,
          auth_error_at: new Date().toISOString(),
          last_health_check_at: new Date().toISOString(),
          health_check_failures: newConsecutiveFailures,
        })
        .eq('id', channelId);
      
      // Log error to channel_errors
      await supabase
        .from('channel_errors')
        .insert({
          channel_id: channelId,
          user_id: userId,
          error_code: classifiedError.code,
          error_category: classifiedError.category,
          severity: classifiedError.severity,
          error_message: classifiedError.userMessage,
          error_description: classifiedError.technicalMessage,
          raw_error: error,
          operation: operation || 'unknown',
          request_id: requestId,
          recommended_action: classifiedError.recommendedAction,
          is_retryable: classifiedError.isRetryable,
        });
      
      // Create audit log entry
      await supabase
        .from('audit_log')
        .insert({
          user_id: userId,
          actor_type: 'system',
          entity_type: 'youtube_channel',
          entity_id: channelId,
          action: 'status_changed',
          old_values: { status: previousStatus },
          new_values: { status: newStatus, error_code: classifiedError.code },
          metadata: { operation, request_id: requestId },
          request_id: requestId,
        });
      
      // Send notification if needed (with SHA-256 deduplication and escalation)
      // Critical/High: immediate, Medium: after 5 failures
      const shouldNotify = 
        classifiedError.severity === 'critical' ||
        classifiedError.severity === 'high' ||
        (classifiedError.severity === 'medium' && newConsecutiveFailures >= 5);
        
      if (shouldNotify) {
        // Create notification hash for deduplication
        const notificationHash = await createNotificationHash(channelId, classifiedError.code, classifiedError.severity);
        
        // Check if notification was sent in last 24h with same hash
        const cooldownMs = classifiedError.severity === 'critical' ? 3600000 : 7200000;
        const cooldownUntil = new Date(Date.now() - cooldownMs).toISOString();
        
        const { data: recentNotification } = await supabase
          .from('notification_log')
          .select('id, duplicate_count')
          .eq('notification_key', notificationHash)
          .gte('sent_at', cooldownUntil)
          .limit(1)
          .maybeSingle();
        
        // If duplicate found, increment counter and skip
        if (recentNotification) {
          await supabase
            .from('notification_log')
            .update({ 
              duplicate_count: (recentNotification.duplicate_count || 0) + 1,
              is_rate_limited: true,
            })
            .eq('id', recentNotification.id);
          
          // Log metrics for dedup
          console.log(JSON.stringify({
            type: 'metrics',
            metrics: { dedup_skipped: 1 },
            labels: { platform: 'youtube', error_code: classifiedError.code, severity: classifiedError.severity },
          }));
          
          console.log(JSON.stringify({
            requestId,
            level: 'info',
            message: 'Skipping duplicate notification',
            channelId: channelId.slice(0, 8),
            hash: notificationHash,
            duplicateCount: (recentNotification.duplicate_count || 0) + 1,
          }));
        } else {
          // Check per-user rate limit (max 5 notifications per hour)
          const { count: recentUserNotifications } = await supabase
            .from('notification_log')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('sent_at', new Date(Date.now() - 3600000).toISOString());
          
          if ((recentUserNotifications || 0) >= 5) {
            // Log rate limited notification
            await supabase
              .from('notification_log')
              .insert({
                user_id: userId,
                channel_id: channelId,
                notification_type: 'auth_issue',
                notification_key: notificationHash,
                error_code: classifiedError.code,
                error_category: classifiedError.category,
                severity: classifiedError.severity,
                delivery_status: 'rate_limited',
                is_rate_limited: true,
                correlation_id: body.requestId,
              });
            
            console.log(JSON.stringify({
              type: 'metrics',
              metrics: { rate_limited: 1 },
              labels: { platform: 'youtube', error_code: classifiedError.code },
            }));
            
            console.log(JSON.stringify({
              requestId,
              level: 'info',
              message: 'User notification rate limit reached, skipping',
              channelId: channelId.slice(0, 8),
              userId: userId.slice(0, 8),
              recentNotifications: recentUserNotifications,
            }));
          } else {
          // Get channel info for notification
          const { data: channel } = await supabase
            .from('youtube_channels')
            .select('channel_title, channel_handle')
            .eq('id', channelId)
            .single();
          
          // Send notification - determine issue type based on error
          const getIssueType = (): 'token_revoked' | 'api_not_enabled' | 'auth_failed' | 'quota_exceeded' => {
            if (classifiedError.code === 'accessNotConfigured') return 'api_not_enabled';
            if (classifiedError.code === 'quotaExceeded') return 'quota_exceeded';
            if (classifiedError.category === 'AUTH') return 'token_revoked';
            return 'auth_failed';
          };
          
          try {
            await supabase.functions.invoke('youtube-auth-notification', {
              body: {
                channelId,
                userId,
                channelName: channel?.channel_title || channel?.channel_handle || 'Unknown Channel',
                issueType: getIssueType(),
              },
            });
            
              // Log notification with hash for deduplication
              await supabase
                .from('notification_log')
                .insert({
                  user_id: userId,
                  channel_id: channelId,
                  notification_type: 'auth_issue',
                  notification_key: notificationHash,
                  error_code: classifiedError.code,
                  error_category: classifiedError.category,
                  severity: classifiedError.severity,
                  delivery_status: 'sent',
                  sent_at: new Date().toISOString(),
                  cooldown_until: new Date(Date.now() + cooldownMs).toISOString(),
                  duplicate_count: 0,
                  correlation_id: body.requestId,
                });
                
              // Log metrics for notification sent
              console.log(JSON.stringify({
                type: 'metrics',
                metrics: { notifications_sent: 1 },
                labels: { platform: 'youtube', error_code: classifiedError.code, severity: classifiedError.severity },
              }));
                
              console.log(JSON.stringify({
                requestId,
                level: 'info',
                message: 'Notification sent',
                channelId: channelId.slice(0, 8),
                hash: notificationHash,
              }));
            } catch (notifyError) {
              console.error('Failed to send notification:', notifyError);
            }
          }
        }
      }
      
      return new Response(JSON.stringify({
        success: true,
        requestId,
        health: {
          status: newStatus,
          circuitState: newCircuitState,
          consecutiveFailures: newConsecutiveFailures,
          nextRetryAt,
        },
        error: classifiedError,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // =========================================
    // ACTION: record_success
    // =========================================
    if (body.action === 'record_success') {
      const { channelId, operation } = body as RecordSuccessRequest;
      
      console.log(JSON.stringify({
        requestId,
        level: 'info',
        message: 'Recording success',
        channelId: channelId.slice(0, 8),
        operation,
      }));
      
      // Get health record
      const { data: health } = await supabase
        .from('channel_health')
        .select('*')
        .eq('channel_id', channelId)
        .single();
      
      if (!health) {
        // Create healthy record
        await supabase
          .from('channel_health')
          .insert({
            channel_id: channelId,
            channel_type: 'youtube',
            status: 'healthy',
            last_successful_operation_at: new Date().toISOString(),
          });
        
        return new Response(JSON.stringify({ success: true, requestId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Calculate new metrics
      const newConsecutiveSuccesses = health.consecutive_successes + 1;
      const newTotalSuccesses = health.total_successes + 1;
      const totalOperations = newTotalSuccesses + health.total_failures;
      const newSuccessRate = ((newTotalSuccesses / totalOperations) * 100).toFixed(2);
      
      // Handle circuit breaker state transitions
      let newCircuitState = health.circuit_state;
      if (health.circuit_state === 'half_open' && newConsecutiveSuccesses >= CIRCUIT_BREAKER_CONFIG.successThreshold) {
        newCircuitState = 'closed';
        console.log(JSON.stringify({
          requestId,
          level: 'info',
          message: 'Circuit breaker closed after successful recovery',
          channelId: channelId.slice(0, 8),
        }));
      }
      
      // Determine if we should recover to healthy
      const wasUnhealthy = health.status !== 'healthy';
      const newStatus = newCircuitState === 'closed' ? 'healthy' : health.status;
      
      // Update health record
      await supabase
        .from('channel_health')
        .update({
          status: newStatus,
          previous_status: wasUnhealthy && newStatus === 'healthy' ? health.status : health.previous_status,
          status_changed_at: wasUnhealthy && newStatus === 'healthy' ? new Date().toISOString() : health.status_changed_at,
          consecutive_successes: newConsecutiveSuccesses,
          consecutive_failures: 0,
          total_successes: newTotalSuccesses,
          success_rate: parseFloat(newSuccessRate),
          circuit_state: newCircuitState,
          circuit_opened_at: newCircuitState === 'closed' ? null : health.circuit_opened_at,
          last_error_code: newStatus === 'healthy' ? null : health.last_error_code,
          last_error_message: newStatus === 'healthy' ? null : health.last_error_message,
          next_retry_at: null,
          retry_count: 0,
          last_successful_operation_at: new Date().toISOString(),
          last_health_check_at: new Date().toISOString(),
          auto_recovery_attempts: 0,
        })
        .eq('id', health.id);
      
      // If recovered, update youtube_channels
      if (wasUnhealthy && newStatus === 'healthy') {
        await supabase
          .from('youtube_channels')
          .update({
            auth_status: 'connected',
            is_connected: true,
            auth_error_code: null,
            auth_error_message: null,
            auth_error_at: null,
            health_check_failures: 0,
          })
          .eq('id', channelId);
        
        // Mark related errors as resolved
        await supabase
          .from('channel_errors')
          .update({
            is_resolved: true,
            resolved_at: new Date().toISOString(),
            resolved_by: 'auto',
            resolution_notes: 'Auto-resolved after successful operation',
          })
          .eq('channel_id', channelId)
          .eq('is_resolved', false);
        
        // Audit log
        await supabase
          .from('audit_log')
          .insert({
            actor_type: 'system',
            entity_type: 'youtube_channel',
            entity_id: channelId,
            action: 'auto_recovered',
            old_values: { status: health.status },
            new_values: { status: 'healthy' },
            request_id: requestId,
          });
      }
      
      return new Response(JSON.stringify({
        success: true,
        requestId,
        health: {
          status: newStatus,
          circuitState: newCircuitState,
          consecutiveSuccesses: newConsecutiveSuccesses,
          recovered: wasUnhealthy && newStatus === 'healthy',
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // =========================================
    // ACTION: check_health
    // =========================================
    if (body.action === 'check_health') {
      const { channelId } = body as CheckHealthRequest;
      
      console.log(JSON.stringify({
        requestId,
        level: 'info',
        message: 'Checking channel health',
        channelId: channelId.slice(0, 8),
      }));
      
      // Get channel credentials
      const { data: channel, error: channelError } = await supabase
        .from('youtube_channels')
        .select('*')
        .eq('id', channelId)
        .single();
      
      if (channelError || !channel) {
        return new Response(JSON.stringify({ error: 'Channel not found', requestId }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Check health record for circuit breaker
      const { data: health } = await supabase
        .from('channel_health')
        .select('*')
        .eq('channel_id', channelId)
        .single();
      
      // Check if circuit is open and should transition to half-open
      if (health?.circuit_state === 'open' && health.circuit_opened_at) {
        const openedAt = new Date(health.circuit_opened_at).getTime();
        if (Date.now() - openedAt > CIRCUIT_BREAKER_CONFIG.halfOpenDelay) {
          await supabase
            .from('channel_health')
            .update({ circuit_state: 'half_open' })
            .eq('id', health.id);
          
          console.log(JSON.stringify({
            requestId,
            level: 'info',
            message: 'Circuit breaker transitioned to half-open',
            channelId: channelId.slice(0, 8),
          }));
        }
      }
      
      // Check if channel has required credentials
      if (!channel.refresh_token || !channel.google_client_id || !channel.google_client_secret) {
        return new Response(JSON.stringify({
          success: true,
          requestId,
          healthy: false,
          status: 'issues_config',
          message: 'Missing OAuth credentials',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Try to refresh token
      try {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: channel.google_client_id,
            client_secret: channel.google_client_secret,
            refresh_token: channel.refresh_token,
            grant_type: 'refresh_token',
          }),
        });
        
        const tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
          // Record failure
          await supabase.functions.invoke('channel-health-engine', {
            body: {
              action: 'record_failure',
              channelId,
              userId: channel.user_id,
              error: {
                code: tokenData.error,
                message: tokenData.error_description || tokenData.error,
              },
              operation: 'health_check',
            },
          });
          
          return new Response(JSON.stringify({
            success: true,
            requestId,
            healthy: false,
            status: 'issues_auth',
            error: tokenData.error,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Token refresh succeeded - update channel
        const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
        
        await supabase
          .from('youtube_channels')
          .update({
            access_token: tokenData.access_token,
            token_expires_at: newExpiresAt,
            last_health_check_at: new Date().toISOString(),
          })
          .eq('id', channelId);
        
        // Test API access
        const apiResponse = await fetch(
          'https://www.googleapis.com/youtube/v3/channels?part=id&mine=true',
          { headers: { 'Authorization': `Bearer ${tokenData.access_token}` } }
        );
        
        const apiData = await apiResponse.json();
        
        if (apiData.error) {
          const errorReason = apiData.error.errors?.[0]?.reason;
          await supabase.functions.invoke('channel-health-engine', {
            body: {
              action: 'record_failure',
              channelId,
              userId: channel.user_id,
              error: {
                code: errorReason || 'api_error',
                message: apiData.error.message,
                status: apiData.error.code,
              },
              operation: 'health_check',
            },
          });
          
          return new Response(JSON.stringify({
            success: true,
            requestId,
            healthy: false,
            status: errorReason === 'accessNotConfigured' ? 'issues_config' : 'issues_auth',
            error: errorReason,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Success! Record it
        await supabase.functions.invoke('channel-health-engine', {
          body: {
            action: 'record_success',
            channelId,
            operation: 'health_check',
          },
        });
        
        return new Response(JSON.stringify({
          success: true,
          requestId,
          healthy: true,
          status: 'healthy',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
        
      } catch (error) {
        console.error('Health check error:', error);
        
        return new Response(JSON.stringify({
          success: true,
          requestId,
          healthy: false,
          status: 'degraded',
          error: 'Network error during health check',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // =========================================
    // ACTION: get_health
    // =========================================
    if (body.action === 'get_health') {
      const { channelId } = body as GetHealthRequest;
      
      const { data: health } = await supabase
        .from('channel_health')
        .select('*')
        .eq('channel_id', channelId)
        .single();
      
      const { data: recentErrors } = await supabase
        .from('channel_errors')
        .select('*')
        .eq('channel_id', channelId)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(5);
      
      return new Response(JSON.stringify({
        success: true,
        requestId,
        health: health || {
          status: 'healthy',
          consecutiveFailures: 0,
          consecutiveSuccesses: 0,
          circuitState: 'closed',
        },
        recentErrors: recentErrors || [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action', requestId }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Channel health engine error:', error);
    
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
