import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  Zap,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Clock,
  TrendingUp
} from 'lucide-react';
import { useChannelHealth, useHealthCheck, getStatusDisplay, getCircuitDisplay } from '@/hooks/useChannelHealth';
import { formatDistanceToNow } from 'date-fns';

interface ChannelHealthBadgeProps {
  channelId: string;
  compact?: boolean;
  showActions?: boolean;
  onReauthorize?: () => void;
}

export function ChannelHealthBadge({ 
  channelId, 
  compact = false,
  showActions = false,
  onReauthorize
}: ChannelHealthBadgeProps) {
  const { health, isLoading, refetch } = useChannelHealth(channelId);
  const { checkHealth, isChecking: healthCheckPending } = useHealthCheck();
  const [isChecking, setIsChecking] = useState(false);

  const handleHealthCheck = async () => {
    setIsChecking(true);
    try {
      await checkHealth(channelId);
      await refetch();
    } finally {
      setIsChecking(false);
    }
  };

  const isPending = isChecking || healthCheckPending;

  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-1 animate-pulse">
        <RefreshCw className="h-3 w-3 animate-spin" />
        {!compact && <span>Loading...</span>}
      </Badge>
    );
  }

  if (!health) {
    return null;
  }

  const statusDisplay = getStatusDisplay(health.status);
  const circuitDisplay = getCircuitDisplay(health.circuit_state || 'closed');
  const isHealthy = health.status === 'healthy' || health.status === 'connected';
  const isDegraded = health.status === 'degraded';
  const hasIssues = health.status?.startsWith('issues_');

  const getCircuitIcon = () => {
    switch (health.circuit_state) {
      case 'open':
        return <ShieldAlert className="h-3 w-3" />;
      case 'half_open':
        return <Shield className="h-3 w-3" />;
      default:
        return <ShieldCheck className="h-3 w-3" />;
    }
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                "gap-1 cursor-help transition-all",
                isHealthy && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                isDegraded && "bg-amber-500/10 text-amber-600 border-amber-500/30 animate-pulse",
                hasIssues && "bg-red-500/10 text-red-600 border-red-500/30"
              )}
            >
              {isHealthy ? (
                <CheckCircle className="h-3 w-3" />
              ) : isDegraded ? (
                <Activity className="h-3 w-3" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
              {health.success_rate !== null && (
                <span className="text-xs">{Math.round(health.success_rate)}%</span>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span 
                  className={cn("h-2 w-2 rounded-full", statusDisplay.bgColor)} 
                />
                <span className="font-medium">{statusDisplay.label}</span>
              </div>
              {health.success_rate !== null && (
                <div className="text-xs text-muted-foreground">
                  Success rate: {health.success_rate.toFixed(1)}%
                </div>
              )}
              {health.consecutive_failures > 0 && (
                <div className="text-xs text-amber-600">
                  {health.consecutive_failures} consecutive failure{health.consecutive_failures > 1 ? 's' : ''}
                </div>
              )}
              {health.last_error_message && (
                <div className="text-xs text-red-600 truncate max-w-[200px]">
                  {health.last_error_message}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn(
      "p-3 rounded-xl border transition-all",
      isHealthy && "bg-emerald-500/5 border-emerald-500/20",
      isDegraded && "bg-amber-500/5 border-amber-500/20",
      hasIssues && "bg-red-500/5 border-red-500/20"
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "gap-1",
              isHealthy && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
              isDegraded && "bg-amber-500/10 text-amber-600 border-amber-500/30",
              hasIssues && "bg-red-500/10 text-red-600 border-red-500/30"
            )}
          >
            {statusDisplay.icon}
            <span>{statusDisplay.label}</span>
          </Badge>
          
          {/* Circuit breaker state */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="gap-1 text-xs">
                  {getCircuitIcon()}
                  <span className="hidden sm:inline">{circuitDisplay.label}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Circuit Breaker: {circuitDisplay.label}</p>
                {health.circuit_state === 'open' && (
                  <p className="text-xs text-muted-foreground">
                    Pausing requests to prevent overload
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {showActions && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleHealthCheck}
            disabled={isChecking || isPending}
            className="h-7 px-2"
          >
            <RefreshCw className={cn("h-3 w-3", (isChecking || isPending) && "animate-spin")} />
          </Button>
        )}
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-lg bg-background/50">
          <TrendingUp className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
          <p className="text-sm font-semibold">
            {health.success_rate !== null ? `${health.success_rate.toFixed(0)}%` : '-'}
          </p>
          <p className="text-[10px] text-muted-foreground">Success</p>
        </div>
        <div className="p-2 rounded-lg bg-background/50">
          <Zap className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
          <p className="text-sm font-semibold">
            {health.total_successes ?? 0}
          </p>
          <p className="text-[10px] text-muted-foreground">Uploads</p>
        </div>
        <div className="p-2 rounded-lg bg-background/50">
          <AlertCircle className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
          <p className="text-sm font-semibold">
            {health.consecutive_failures ?? 0}
          </p>
          <p className="text-[10px] text-muted-foreground">Failures</p>
        </div>
      </div>

      {/* Last check time */}
      {health.last_health_check_at && (
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            Last check: {formatDistanceToNow(new Date(health.last_health_check_at), { addSuffix: true })}
          </span>
        </div>
      )}

      {/* Error message */}
      {health.last_error_message && hasIssues && (
        <div className="mt-2 p-2 rounded-lg bg-red-500/10 text-xs text-red-600">
          <p className="font-medium">Last error:</p>
          <p className="truncate">{health.last_error_message}</p>
        </div>
      )}

      {/* Action buttons for issues */}
      {showActions && hasIssues && health.actionButtons && health.actionButtons.length > 0 && (
        <div className="flex gap-2 mt-3">
          {health.actionButtons.map((btn, idx) => (
            <Button
              key={idx}
              size="sm"
              variant={btn.variant as 'default' | 'outline' | 'destructive'}
              onClick={() => {
                if (btn.action === 'reauthorize' && onReauthorize) {
                  onReauthorize();
                } else if (btn.action === 'open_console') {
                  window.open('https://console.cloud.google.com/apis/library/youtube.googleapis.com', '_blank');
                }
              }}
              className="flex-1 text-xs"
            >
              {btn.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
