import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  classifyError, 
  getActionButtons, 
  type ClassifiedError,
  type Severity 
} from '@/lib/error-classifier';

export interface ChannelHealth {
  id: string;
  channel_id: string;
  channel_type: string;
  status: string;
  previous_status: string | null;
  status_changed_at: string | null;
  consecutive_failures: number;
  consecutive_successes: number;
  total_failures: number;
  total_successes: number;
  success_rate: number;
  circuit_state: string;
  circuit_opened_at: string | null;
  circuit_failure_count: number;
  last_error_code: string | null;
  last_error_message: string | null;
  last_error_at: string | null;
  next_retry_at: string | null;
  retry_count: number;
  max_retries: number;
  last_health_check_at: string | null;
  next_health_check_at: string | null;
  last_successful_operation_at: string | null;
  auto_recovery_attempts: number;
  created_at: string;
  updated_at: string;
}

export interface ChannelError {
  id: string;
  channel_id: string;
  user_id: string;
  error_code: string;
  error_category: string;
  severity: string;
  error_message: string;
  error_description: string | null;
  operation: string | null;
  recommended_action: string | null;
  is_retryable: boolean;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface ChannelHealthWithActions extends ChannelHealth {
  classifiedError: ClassifiedError | null;
  actionButtons: ReturnType<typeof getActionButtons>;
}

/**
 * API Response Contract for channel status
 * Matches the production-grade specification
 */
export interface ChannelStatusResponse {
  channel_id: string;
  platform: 'youtube';
  status: string;
  issue: {
    code: string;
    summary: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    last_checked_at: string | null;
    next_retry_at: string | null;
    recommended_action: string;
    technical_message?: string;
    help_url?: string;
  } | null;
  health: {
    success_rate: number;
    consecutive_failures: number;
    consecutive_successes: number;
    circuit_state: string;
    total_operations: number;
  };
  actions: Array<{
    type: 'AUTHORIZE' | 'EDIT_CREDENTIALS' | 'OPEN_CONSOLE' | 'CONTACT_SUPPORT' | 'WAIT';
    label: string;
    url?: string;
    variant: 'default' | 'outline' | 'destructive';
  }>;
}

/**
 * Transform health data to the API response contract format
 */
export function formatChannelStatus(
  health: ChannelHealthWithActions | null,
  channelId: string
): ChannelStatusResponse {
  if (!health) {
    return {
      channel_id: channelId,
      platform: 'youtube',
      status: 'healthy',
      issue: null,
      health: {
        success_rate: 100,
        consecutive_failures: 0,
        consecutive_successes: 0,
        circuit_state: 'closed',
        total_operations: 0,
      },
      actions: [],
    };
  }

  // Build issue object if there's an error
  const issue = health.classifiedError ? {
    code: health.classifiedError.code,
    summary: health.classifiedError.userMessage,
    severity: health.classifiedError.severity,
    last_checked_at: health.last_health_check_at,
    next_retry_at: health.next_retry_at,
    recommended_action: health.classifiedError.recommendedAction,
    technical_message: health.classifiedError.technicalMessage,
    help_url: health.classifiedError.helpUrl,
  } : null;

  // Build actions array
  const actions: ChannelStatusResponse['actions'] = [];
  
  if (health.classifiedError) {
    switch (health.classifiedError.recommendedAction) {
      case 'USER_REAUTH':
        actions.push({
          type: 'AUTHORIZE',
          label: 'Reconnect Channel',
          variant: 'default',
        });
        break;
      case 'USER_CONFIG':
        actions.push({
          type: 'EDIT_CREDENTIALS',
          label: 'Edit Credentials',
          variant: 'default',
        });
        actions.push({
          type: 'OPEN_CONSOLE',
          label: 'Open Google Console',
          url: 'https://console.cloud.google.com/apis/credentials',
          variant: 'outline',
        });
        break;
      case 'CONTACT_SUPPORT':
        actions.push({
          type: 'CONTACT_SUPPORT',
          label: 'Contact Support',
          variant: 'outline',
        });
        break;
      case 'WAIT_AND_RETRY':
      case 'AUTO_RETRY':
        actions.push({
          type: 'WAIT',
          label: 'Will retry automatically',
          variant: 'outline',
        });
        break;
    }
  }

  return {
    channel_id: channelId,
    platform: 'youtube',
    status: health.status,
    issue,
    health: {
      success_rate: health.success_rate,
      consecutive_failures: health.consecutive_failures,
      consecutive_successes: health.consecutive_successes,
      circuit_state: health.circuit_state,
      total_operations: health.total_successes + health.total_failures,
    },
    actions,
  };
}

/**
 * Hook to fetch health data for a specific channel
 */
export function useChannelHealth(channelId: string | undefined) {
  const { user } = useAuth();

  const { data: health, isLoading, error, refetch } = useQuery({
    queryKey: ['channel-health', channelId],
    queryFn: async (): Promise<ChannelHealthWithActions | null> => {
      if (!channelId) return null;

      // First try to get from channel_health table
      const { data, error } = await supabase
        .from('channel_health')
        .select('*')
        .eq('channel_id', channelId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        // Return default healthy state if no record exists
        return {
          id: '',
          channel_id: channelId,
          channel_type: 'youtube',
          status: 'healthy',
          previous_status: null,
          status_changed_at: null,
          consecutive_failures: 0,
          consecutive_successes: 0,
          total_failures: 0,
          total_successes: 0,
          success_rate: 100,
          circuit_state: 'closed',
          circuit_opened_at: null,
          circuit_failure_count: 0,
          last_error_code: null,
          last_error_message: null,
          last_error_at: null,
          next_retry_at: null,
          retry_count: 0,
          max_retries: 5,
          last_health_check_at: null,
          next_health_check_at: null,
          last_successful_operation_at: null,
          auto_recovery_attempts: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          classifiedError: null,
          actionButtons: [],
        };
      }

      // Add classified error and action buttons if there's an error
      let classifiedError: ClassifiedError | null = null;
      let actionButtons: ReturnType<typeof getActionButtons> = [];

      if (data.last_error_code) {
        classifiedError = classifyError({
          code: data.last_error_code,
          message: data.last_error_message || undefined,
        });
        actionButtons = getActionButtons(classifiedError);
      }

      return {
        ...data,
        classifiedError,
        actionButtons,
      } as ChannelHealthWithActions;
    },
    enabled: !!channelId && !!user,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  return {
    health,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch health data for all channels
 */
export function useAllChannelsHealth() {
  const { user, isOwner } = useAuth();

  const { data: healthRecords, isLoading, error, refetch } = useQuery({
    queryKey: ['all-channels-health'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channel_health')
        .select('*')
        .order('status', { ascending: false }); // Issues first

      if (error) throw error;
      return data as ChannelHealth[];
    },
    enabled: !!user,
    staleTime: 30000,
  });

  // Group by status
  const healthByStatus = healthRecords?.reduce((acc, record) => {
    if (!acc[record.status]) {
      acc[record.status] = [];
    }
    acc[record.status].push(record);
    return acc;
  }, {} as Record<string, ChannelHealth[]>) || {};

  // Summary stats
  const summary = {
    total: healthRecords?.length || 0,
    healthy: healthByStatus['healthy']?.length || 0,
    degraded: healthByStatus['degraded']?.length || 0,
    issues_auth: healthByStatus['issues_auth']?.length || 0,
    issues_quota: healthByStatus['issues_quota']?.length || 0,
    issues_config: healthByStatus['issues_config']?.length || 0,
    issues_permission: healthByStatus['issues_permission']?.length || 0,
    suspended: healthByStatus['suspended']?.length || 0,
  };

  return {
    healthRecords,
    healthByStatus,
    summary,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch recent errors for a channel
 */
export function useChannelErrors(channelId: string | undefined) {
  const { user } = useAuth();

  const { data: errors, isLoading, error, refetch } = useQuery({
    queryKey: ['channel-errors', channelId],
    queryFn: async () => {
      if (!channelId) return [];

      const { data, error } = await supabase
        .from('channel_errors')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as ChannelError[];
    },
    enabled: !!channelId && !!user,
    staleTime: 30000,
  });

  const unresolvedErrors = errors?.filter(e => !e.is_resolved) || [];

  return {
    errors,
    unresolvedErrors,
    hasUnresolvedErrors: unresolvedErrors.length > 0,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to trigger a health check for a channel
 */
export function useHealthCheck() {
  const queryClient = useQueryClient();

  const checkHealthMutation = useMutation({
    mutationFn: async (channelId: string) => {
      const { data, error } = await supabase.functions.invoke('channel-health-engine', {
        body: {
          action: 'check_health',
          channelId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, channelId) => {
      queryClient.invalidateQueries({ queryKey: ['channel-health', channelId] });
      queryClient.invalidateQueries({ queryKey: ['all-channels-health'] });
      queryClient.invalidateQueries({ queryKey: ['youtube-channels'] });
    },
  });

  return {
    checkHealth: checkHealthMutation.mutateAsync,
    isChecking: checkHealthMutation.isPending,
    error: checkHealthMutation.error,
  };
}

/**
 * Get status display info
 */
export function getStatusDisplay(status: string): {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
} {
  switch (status) {
    case 'healthy':
      return {
        label: 'Healthy',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        icon: '✓',
      };
    case 'degraded':
      return {
        label: 'Degraded',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        icon: '⚠',
      };
    case 'issues_auth':
      return {
        label: 'Auth Issue',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: '🔐',
      };
    case 'issues_quota':
      return {
        label: 'Quota Exceeded',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        icon: '📊',
      };
    case 'issues_config':
      return {
        label: 'Config Issue',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: '⚙️',
      };
    case 'issues_permission':
      return {
        label: 'Permission Issue',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: '🚫',
      };
    case 'suspended':
      return {
        label: 'Suspended',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        icon: '⏸️',
      };
    default:
      return {
        label: 'Unknown',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        icon: '?',
      };
  }
}

/**
 * Get circuit breaker display info
 */
export function getCircuitDisplay(state: string): {
  label: string;
  color: string;
} {
  switch (state) {
    case 'closed':
      return { label: 'Normal', color: 'text-green-600' };
    case 'open':
      return { label: 'Circuit Open', color: 'text-red-600' };
    case 'half_open':
      return { label: 'Recovering', color: 'text-yellow-600' };
    default:
      return { label: 'Unknown', color: 'text-gray-600' };
  }
}
