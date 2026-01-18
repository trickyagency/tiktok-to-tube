import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink, 
  KeyRound,
  Clock,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Zap
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { type ClassifiedError, type RecommendedAction } from '@/lib/error-classifier';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ChannelIssue {
  code: string;
  summary: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  lastCheckedAt: string | null;
  nextRetryAt: string | null;
  recommendedAction: RecommendedAction;
  technicalMessage?: string;
  helpUrl?: string;
}

interface ChannelIssueBannerProps {
  channelId: string;
  status: string;
  issue?: ChannelIssue | null;
  circuitState?: string;
  consecutiveFailures?: number;
  onReauthorize: () => void;
  onEditCredentials: () => void;
  isReauthorizing?: boolean;
}

// Severity styling map
const severityStyles = {
  critical: {
    container: 'border-red-500/30 bg-red-500/5',
    icon: 'text-red-500',
    title: 'text-red-600',
    badge: 'bg-red-500/10 text-red-600 border-red-500/30',
  },
  high: {
    container: 'border-orange-500/30 bg-orange-500/5',
    icon: 'text-orange-500',
    title: 'text-orange-600',
    badge: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  },
  medium: {
    container: 'border-amber-500/30 bg-amber-500/5',
    icon: 'text-amber-500',
    title: 'text-amber-600',
    badge: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  },
  low: {
    container: 'border-blue-500/30 bg-blue-500/5',
    icon: 'text-blue-500',
    title: 'text-blue-600',
    badge: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  },
};

// Quota status styling (violet theme)
const quotaStyles = {
  container: 'border-violet-500/30 bg-violet-500/5',
  icon: 'text-violet-500',
  title: 'text-violet-600',
  badge: 'bg-violet-500/10 text-violet-600 border-violet-500/30',
};

// Calculate time until midnight PT
function getTimeUntilQuotaReset(): string {
  const now = new Date();
  
  // Get current time in PT
  const ptFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  
  const ptParts = ptFormatter.formatToParts(now);
  const currentHour = parseInt(ptParts.find(p => p.type === 'hour')?.value || '0');
  const currentMinute = parseInt(ptParts.find(p => p.type === 'minute')?.value || '0');
  
  // Calculate hours and minutes until midnight PT
  const hoursUntil = 23 - currentHour;
  const minutesUntil = 60 - currentMinute;
  
  if (hoursUntil <= 0 && minutesUntil <= 0) {
    return 'soon';
  }
  
  if (hoursUntil > 0) {
    return `${hoursUntil}h ${minutesUntil}m`;
  }
  
  return `${minutesUntil} minutes`;
}

// Default issue summaries by status
function getDefaultIssueSummary(status: string): string {
  switch (status) {
    case 'issues_auth':
    case 'token_revoked':
      return 'Authorization has expired or was revoked';
    case 'issues_config':
    case 'api_not_enabled':
      return 'YouTube API configuration issue detected';
    case 'issues_quota':
    case 'quota_exceeded':
      return `Daily quota exhausted — resets in ${getTimeUntilQuotaReset()}`;
    case 'issues_permission':
    case 'permission_denied':
      return 'Insufficient permissions to access YouTube';
    case 'degraded':
      return 'Temporary issues detected, will retry automatically';
    case 'suspended':
      return 'Channel suspended after repeated failures';
    case 'failed':
      return 'Authorization failed';
    default:
      return 'Channel requires attention';
  }
}

function getDefaultSeverity(status: string): 'low' | 'medium' | 'high' | 'critical' {
  switch (status) {
    case 'issues_auth':
    case 'token_revoked':
    case 'issues_config':
    case 'api_not_enabled':
    case 'suspended':
      return 'critical';
    case 'issues_permission':
    case 'permission_denied':
    case 'failed':
      return 'high';
    case 'issues_quota':
    case 'quota_exceeded':
      return 'medium';
    case 'degraded':
      return 'low';
    default:
      return 'medium';
  }
}

function getDefaultRecommendedAction(status: string): RecommendedAction {
  switch (status) {
    case 'issues_auth':
    case 'token_revoked':
    case 'issues_permission':
    case 'permission_denied':
    case 'failed':
      return 'USER_REAUTH';
    case 'issues_config':
    case 'api_not_enabled':
      return 'USER_CONFIG';
    case 'issues_quota':
    case 'quota_exceeded':
    case 'degraded':
      return 'WAIT_AND_RETRY';
    case 'suspended':
      return 'CONTACT_SUPPORT';
    default:
      return 'USER_REAUTH';
  }
}

export function ChannelIssueBanner({
  channelId,
  status,
  issue,
  circuitState,
  consecutiveFailures = 0,
  onReauthorize,
  onEditCredentials,
  isReauthorizing = false,
}: ChannelIssueBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't show banner for connected/healthy channels
  if (status === 'connected' || status === 'healthy') {
    return null;
  }

  // Build issue from status if not provided
  const effectiveIssue: ChannelIssue = issue || {
    code: status,
    summary: getDefaultIssueSummary(status),
    severity: getDefaultSeverity(status),
    lastCheckedAt: null,
    nextRetryAt: null,
    recommendedAction: getDefaultRecommendedAction(status),
  };

  // Determine if this is a quota issue for special styling
  const isQuotaIssue = status === 'quota_exceeded' || status === 'issues_quota';
  const styles = isQuotaIssue ? quotaStyles : severityStyles[effectiveIssue.severity];
  const showAutoRetryMessage = effectiveIssue.recommendedAction === 'WAIT_AND_RETRY' || effectiveIssue.recommendedAction === 'AUTO_RETRY';

  return (
    <Alert className={cn('rounded-xl border', styles.container)}>
      <div className="flex items-start gap-3">
        <ShieldAlert className={cn('h-5 w-5 mt-0.5', styles.icon)} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <AlertTitle className={cn('text-sm font-medium', styles.title)}>
              {effectiveIssue.summary}
            </AlertTitle>
            <Badge variant="outline" className={cn('text-[10px] h-5', styles.badge)}>
              {effectiveIssue.severity.toUpperCase()}
            </Badge>
            {circuitState === 'open' && (
              <Badge variant="outline" className="text-[10px] h-5 bg-red-500/10 text-red-600 border-red-500/30">
                <Zap className="h-2.5 w-2.5 mr-1" />
                Circuit Open
              </Badge>
            )}
          </div>
          
          <AlertDescription className="mt-2 space-y-2">
            {/* Status info row */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {effectiveIssue.lastCheckedAt && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last checked: {formatDistanceToNow(new Date(effectiveIssue.lastCheckedAt), { addSuffix: true })}
                </span>
              )}
              {consecutiveFailures > 0 && (
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {consecutiveFailures} consecutive failure{consecutiveFailures > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Auto-retry message */}
            {showAutoRetryMessage && effectiveIssue.nextRetryAt && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <RefreshCw className="h-3 w-3" />
                <span>Will retry automatically {formatDistanceToNow(new Date(effectiveIssue.nextRetryAt), { addSuffix: true })}</span>
              </div>
            )}

            {/* Technical details (expandable) */}
            {effectiveIssue.technicalMessage && (
              <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground">
                    {isExpanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                    {isExpanded ? 'Hide details' : 'Show details'}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 p-2 rounded-lg bg-muted/50 text-xs font-mono text-muted-foreground">
                    {effectiveIssue.technicalMessage}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 mt-3">
              {(effectiveIssue.recommendedAction === 'USER_REAUTH') && (
                <>
                  <Button
                    size="sm"
                    onClick={onReauthorize}
                    disabled={isReauthorizing}
                    className="h-8"
                  >
                    {isReauthorizing ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Re-authorizing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                        Reconnect Channel
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onEditCredentials}
                    className="h-8"
                  >
                    <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                    Edit Credentials
                  </Button>
                </>
              )}
              
              {(effectiveIssue.recommendedAction === 'USER_CONFIG') && (
                <>
                  <Button
                    size="sm"
                    onClick={onEditCredentials}
                    className="h-8"
                  >
                    <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                    Edit Credentials
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="h-8"
                  >
                    <a
                      href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Open Google Console
                    </a>
                  </Button>
                </>
              )}
              
              {effectiveIssue.recommendedAction === 'WAIT_AND_RETRY' && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Will recover automatically when quota resets or issues resolve</span>
                </div>
              )}
              
              {effectiveIssue.recommendedAction === 'CONTACT_SUPPORT' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onReauthorize}
                  disabled={isReauthorizing}
                  className="h-8"
                >
                  {isReauthorizing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Trying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      Try Reconnecting
                    </>
                  )}
                </Button>
              )}
              
              {effectiveIssue.helpUrl && (
                <Button
                  size="sm"
                  variant="ghost"
                  asChild
                  className="h-8 text-muted-foreground"
                >
                  <a
                    href={effectiveIssue.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
                    Learn more
                  </a>
                </Button>
              )}
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}