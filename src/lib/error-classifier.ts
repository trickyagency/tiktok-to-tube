/**
 * Production-grade Error Classification Engine
 * Classifies API errors into categories with severity and recommended actions
 */

export type ErrorCategory = 
  | 'AUTH'
  | 'QUOTA'
  | 'CONFIG'
  | 'PERMISSION'
  | 'RATE_LIMIT'
  | 'PLATFORM_DOWN'
  | 'NETWORK'
  | 'UNKNOWN';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type RecommendedAction = 
  | 'AUTO_RETRY'
  | 'USER_REAUTH'
  | 'USER_CONFIG'
  | 'CONTACT_SUPPORT'
  | 'WAIT_AND_RETRY';

export interface ClassifiedError {
  code: string;
  category: ErrorCategory;
  severity: Severity;
  recommendedAction: RecommendedAction;
  isRetryable: boolean;
  retryDelayMs: number;
  maxRetries: number;
  userMessage: string;
  technicalMessage: string;
  helpUrl?: string;
}

export interface ErrorInput {
  code?: string;
  message?: string;
  status?: number;
  description?: string;
  raw?: unknown;
}

// Google/YouTube specific error mappings
const GOOGLE_ERROR_MAP: Record<string, Omit<ClassifiedError, 'code' | 'technicalMessage'>> = {
  'invalid_grant': {
    category: 'AUTH',
    severity: 'critical',
    recommendedAction: 'USER_REAUTH',
    isRetryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    userMessage: 'Your authorization has expired or was revoked. Please re-authorize your channel.',
    helpUrl: '/dashboard/youtube',
  },
  'invalid_client': {
    category: 'CONFIG',
    severity: 'critical',
    recommendedAction: 'USER_CONFIG',
    isRetryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    userMessage: 'OAuth credentials are invalid. Please check your Client ID and Secret.',
    helpUrl: 'https://console.cloud.google.com/apis/credentials',
  },
  'unauthorized_client': {
    category: 'CONFIG',
    severity: 'high',
    recommendedAction: 'USER_CONFIG',
    isRetryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    userMessage: 'Client is not authorized. Check your OAuth consent screen settings.',
    helpUrl: 'https://console.cloud.google.com/apis/credentials/consent',
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
  'redirect_uri_mismatch': {
    category: 'CONFIG',
    severity: 'critical',
    recommendedAction: 'USER_CONFIG',
    isRetryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    userMessage: 'Redirect URI mismatch. Update your Google Cloud Console to use the correct redirect URI.',
    helpUrl: 'https://console.cloud.google.com/apis/credentials',
  },
  'invalid_scope': {
    category: 'CONFIG',
    severity: 'high',
    recommendedAction: 'USER_CONFIG',
    isRetryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    userMessage: 'Invalid OAuth scope. Ensure YouTube API is enabled in Google Cloud Console.',
    helpUrl: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com',
  },
  'accessNotConfigured': {
    category: 'CONFIG',
    severity: 'critical',
    recommendedAction: 'USER_CONFIG',
    isRetryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    userMessage: 'YouTube Data API v3 is not enabled. Enable it in your Google Cloud Console.',
    helpUrl: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com',
  },
  'quotaExceeded': {
    category: 'QUOTA',
    severity: 'medium',
    recommendedAction: 'WAIT_AND_RETRY',
    isRetryable: true,
    retryDelayMs: 3600000, // 1 hour
    maxRetries: 1, // Will auto-retry after quota resets
    userMessage: 'YouTube API quota exceeded. Uploads will resume when quota resets at midnight Pacific Time.',
  },
  'dailyLimitExceeded': {
    category: 'QUOTA',
    severity: 'medium',
    recommendedAction: 'WAIT_AND_RETRY',
    isRetryable: true,
    retryDelayMs: 3600000, // 1 hour
    maxRetries: 1,
    userMessage: 'Daily upload limit reached. Uploads will resume tomorrow.',
  },
  'userRateLimitExceeded': {
    category: 'RATE_LIMIT',
    severity: 'low',
    recommendedAction: 'AUTO_RETRY',
    isRetryable: true,
    retryDelayMs: 60000, // 1 minute
    maxRetries: 5,
    userMessage: 'Rate limit exceeded. Will retry automatically.',
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
  'forbidden': {
    category: 'PERMISSION',
    severity: 'high',
    recommendedAction: 'USER_REAUTH',
    isRetryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    userMessage: 'Access forbidden. This may require additional permissions or the channel may be restricted.',
  },
  'notFound': {
    category: 'CONFIG',
    severity: 'high',
    recommendedAction: 'USER_CONFIG',
    isRetryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    userMessage: 'Resource not found. The YouTube channel may have been deleted or moved.',
  },
  'channelNotFound': {
    category: 'CONFIG',
    severity: 'high',
    recommendedAction: 'USER_CONFIG',
    isRetryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
    userMessage: 'YouTube channel not found. Please verify the channel exists.',
  },
};

// HTTP status code mappings
const HTTP_STATUS_MAP: Record<number, Omit<ClassifiedError, 'code' | 'technicalMessage' | 'userMessage'>> = {
  400: {
    category: 'CONFIG',
    severity: 'medium',
    recommendedAction: 'USER_CONFIG',
    isRetryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
  },
  401: {
    category: 'AUTH',
    severity: 'critical',
    recommendedAction: 'USER_REAUTH',
    isRetryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
  },
  403: {
    category: 'PERMISSION',
    severity: 'high',
    recommendedAction: 'USER_REAUTH',
    isRetryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
  },
  404: {
    category: 'CONFIG',
    severity: 'medium',
    recommendedAction: 'USER_CONFIG',
    isRetryable: false,
    retryDelayMs: 0,
    maxRetries: 0,
  },
  429: {
    category: 'RATE_LIMIT',
    severity: 'low',
    recommendedAction: 'AUTO_RETRY',
    isRetryable: true,
    retryDelayMs: 60000, // 1 minute
    maxRetries: 5,
  },
  500: {
    category: 'PLATFORM_DOWN',
    severity: 'medium',
    recommendedAction: 'AUTO_RETRY',
    isRetryable: true,
    retryDelayMs: 30000, // 30 seconds
    maxRetries: 3,
  },
  502: {
    category: 'PLATFORM_DOWN',
    severity: 'medium',
    recommendedAction: 'AUTO_RETRY',
    isRetryable: true,
    retryDelayMs: 30000,
    maxRetries: 3,
  },
  503: {
    category: 'PLATFORM_DOWN',
    severity: 'medium',
    recommendedAction: 'AUTO_RETRY',
    isRetryable: true,
    retryDelayMs: 60000, // 1 minute
    maxRetries: 3,
  },
  504: {
    category: 'PLATFORM_DOWN',
    severity: 'medium',
    recommendedAction: 'AUTO_RETRY',
    isRetryable: true,
    retryDelayMs: 30000,
    maxRetries: 3,
  },
};

// Default user messages for HTTP errors
const HTTP_USER_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your settings and try again.',
  401: 'Authentication required. Please re-authorize your channel.',
  403: 'Access denied. You may need to grant additional permissions.',
  404: 'Resource not found. Please check your configuration.',
  429: 'Too many requests. Will retry automatically.',
  500: 'Server error occurred. Will retry automatically.',
  502: 'Service temporarily unavailable. Will retry automatically.',
  503: 'Service temporarily unavailable. Will retry automatically.',
  504: 'Request timed out. Will retry automatically.',
};

/**
 * Classify an error from any API into a structured error object
 */
export function classifyError(input: ErrorInput): ClassifiedError {
  const code = input.code || '';
  const message = input.message || '';
  const description = input.description || '';
  const status = input.status;
  const combinedText = `${code} ${message} ${description}`.toLowerCase();
  
  // 1. Check for exact Google error code match
  if (code && GOOGLE_ERROR_MAP[code]) {
    const mapping = GOOGLE_ERROR_MAP[code];
    return {
      code,
      technicalMessage: message || description || code,
      ...mapping,
    };
  }
  
  // 2. Check for known error patterns in message/description
  for (const [errorCode, mapping] of Object.entries(GOOGLE_ERROR_MAP)) {
    if (combinedText.includes(errorCode.toLowerCase())) {
      return {
        code: errorCode,
        technicalMessage: message || description || errorCode,
        ...mapping,
      };
    }
  }
  
  // 3. Check for API not enabled patterns
  if (
    combinedText.includes('youtube data api') ||
    combinedText.includes('has not been used') ||
    combinedText.includes('it is disabled') ||
    combinedText.includes('api not enabled')
  ) {
    return {
      code: 'accessNotConfigured',
      technicalMessage: message || description,
      ...GOOGLE_ERROR_MAP['accessNotConfigured'],
    };
  }
  
  // 4. Check for quota patterns
  if (
    combinedText.includes('quota') ||
    combinedText.includes('limit exceeded') ||
    combinedText.includes('rate limit')
  ) {
    return {
      code: 'quotaExceeded',
      technicalMessage: message || description,
      ...GOOGLE_ERROR_MAP['quotaExceeded'],
    };
  }
  
  // 5. Check for network errors
  if (
    combinedText.includes('network') ||
    combinedText.includes('timeout') ||
    combinedText.includes('connection') ||
    combinedText.includes('econnrefused') ||
    combinedText.includes('fetch failed')
  ) {
    return {
      code: 'network_error',
      category: 'NETWORK',
      severity: 'medium',
      recommendedAction: 'AUTO_RETRY',
      isRetryable: true,
      retryDelayMs: 5000, // 5 seconds
      maxRetries: 3,
      userMessage: 'Network error occurred. Will retry automatically.',
      technicalMessage: message || 'Network connection failed',
    };
  }
  
  // 6. Fall back to HTTP status code mapping
  if (status && HTTP_STATUS_MAP[status]) {
    const mapping = HTTP_STATUS_MAP[status];
    return {
      code: `HTTP_${status}`,
      technicalMessage: message || description || `HTTP ${status}`,
      userMessage: HTTP_USER_MESSAGES[status] || `HTTP error ${status} occurred.`,
      ...mapping,
    };
  }
  
  // 7. Default to unknown error
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

/**
 * Get the channel status based on error category
 */
export function getChannelStatusFromError(error: ClassifiedError): string {
  switch (error.category) {
    case 'AUTH':
      return 'issues_auth';
    case 'QUOTA':
      return 'issues_quota';
    case 'CONFIG':
      return 'issues_config';
    case 'PERMISSION':
      return 'issues_permission';
    case 'RATE_LIMIT':
    case 'PLATFORM_DOWN':
    case 'NETWORK':
      return 'degraded';
    default:
      return 'issues_auth';
  }
}

/**
 * Get the auth_status for youtube_channels table
 */
export function getAuthStatusFromError(error: ClassifiedError): string {
  switch (error.category) {
    case 'AUTH':
      return 'token_revoked';
    case 'CONFIG':
      if (error.code === 'accessNotConfigured') {
        return 'api_not_enabled';
      }
      return 'failed';
    case 'QUOTA':
      return 'quota_exceeded';
    case 'PERMISSION':
      return 'permission_denied';
    default:
      return 'failed';
  }
}

/**
 * Calculate cooldown period for notifications based on severity
 */
export function getNotificationCooldownMs(severity: Severity): number {
  switch (severity) {
    case 'critical':
      return 60 * 60 * 1000; // 1 hour
    case 'high':
      return 2 * 60 * 60 * 1000; // 2 hours
    case 'medium':
      return 4 * 60 * 60 * 1000; // 4 hours
    case 'low':
      return 24 * 60 * 60 * 1000; // 24 hours (daily digest)
    default:
      return 4 * 60 * 60 * 1000;
  }
}

/**
 * Check if notification should be sent based on failure count and severity
 */
export function shouldSendNotification(
  severity: Severity,
  consecutiveFailures: number,
  lastNotificationAt: Date | null,
  cooldownMs: number
): boolean {
  // Check cooldown
  if (lastNotificationAt) {
    const timeSinceLastNotification = Date.now() - lastNotificationAt.getTime();
    if (timeSinceLastNotification < cooldownMs) {
      return false;
    }
  }
  
  // Send immediately for critical issues
  if (severity === 'critical') {
    return true;
  }
  
  // Send immediately for high severity
  if (severity === 'high') {
    return true;
  }
  
  // For medium severity, wait for 2 consecutive failures
  if (severity === 'medium') {
    return consecutiveFailures >= 2;
  }
  
  // For low severity, only send in daily digest (handled separately)
  return false;
}

/**
 * Get action buttons for the frontend based on error
 */
export function getActionButtons(error: ClassifiedError): Array<{
  label: string;
  action: string;
  variant: 'default' | 'outline' | 'destructive';
  url?: string;
}> {
  const buttons: Array<{
    label: string;
    action: string;
    variant: 'default' | 'outline' | 'destructive';
    url?: string;
  }> = [];
  
  switch (error.recommendedAction) {
    case 'USER_REAUTH':
      buttons.push({
        label: 'Re-authorize',
        action: 'reauthorize',
        variant: 'default',
      });
      break;
    case 'USER_CONFIG':
      buttons.push({
        label: 'Update Credentials',
        action: 'edit_credentials',
        variant: 'default',
      });
      if (error.helpUrl) {
        buttons.push({
          label: 'Open Google Console',
          action: 'open_link',
          variant: 'outline',
          url: error.helpUrl,
        });
      }
      break;
    case 'WAIT_AND_RETRY':
      buttons.push({
        label: 'Check Status',
        action: 'check_status',
        variant: 'outline',
      });
      break;
    case 'CONTACT_SUPPORT':
      buttons.push({
        label: 'Contact Support',
        action: 'contact_support',
        variant: 'outline',
      });
      break;
  }
  
  // Always add a refresh button
  buttons.push({
    label: 'Refresh',
    action: 'refresh',
    variant: 'outline',
  });
  
  return buttons;
}

/**
 * Format retry delay for display
 */
export function formatRetryDelay(delayMs: number): string {
  if (delayMs < 60000) {
    return `${Math.round(delayMs / 1000)} seconds`;
  }
  if (delayMs < 3600000) {
    return `${Math.round(delayMs / 60000)} minutes`;
  }
  return `${Math.round(delayMs / 3600000)} hours`;
}
