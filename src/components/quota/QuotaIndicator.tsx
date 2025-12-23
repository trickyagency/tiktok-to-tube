import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pause, Play, AlertTriangle, Ban, Gauge } from 'lucide-react';
import { QuotaUsage, useToggleChannelPause } from '@/hooks/useYouTubeQuota';
import { cn } from '@/lib/utils';

interface QuotaIndicatorProps {
  quota: QuotaUsage;
  compact?: boolean;
}

export function QuotaIndicator({ quota, compact = false }: QuotaIndicatorProps) {
  const togglePause = useToggleChannelPause();
  
  const isWarning = quota.usagePercentage >= 80;
  const isExhausted = quota.remainingUploads <= 0;
  const isPaused = quota.is_paused;

  const getStatusColor = () => {
    if (isPaused) return 'text-muted-foreground';
    if (isExhausted) return 'text-destructive';
    if (isWarning) return 'text-warning';
    return 'text-success';
  };

  const getProgressColor = () => {
    if (isPaused) return 'bg-muted';
    if (isExhausted) return 'bg-destructive';
    if (isWarning) return 'bg-warning';
    return 'bg-success';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Gauge className={cn("h-4 w-4", getStatusColor())} />
        <span className={cn("text-sm font-medium", getStatusColor())}>
          {quota.remainingUploads} uploads left
        </span>
        {isPaused && (
          <Badge variant="secondary" className="text-xs">Paused</Badge>
        )}
        {isExhausted && !isPaused && (
          <Badge variant="destructive" className="text-xs">Quota Exhausted</Badge>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className={cn("h-5 w-5", getStatusColor())} />
          <span className="font-medium">Daily Quota</span>
        </div>
        <div className="flex items-center gap-2">
          {isPaused ? (
            <Badge variant="secondary" className="gap-1">
              <Pause className="h-3 w-3" />
              Paused
            </Badge>
          ) : isExhausted ? (
            <Badge variant="destructive" className="gap-1">
              <Ban className="h-3 w-3" />
              Exhausted
            </Badge>
          ) : isWarning ? (
            <Badge variant="outline" className="gap-1 border-warning text-warning">
              <AlertTriangle className="h-3 w-3" />
              Low
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 border-success text-success">
              Available
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {quota.quota_used.toLocaleString()} / {quota.quota_limit.toLocaleString()} units
          </span>
          <span className={cn("font-medium", getStatusColor())}>
            {quota.usagePercentage}%
          </span>
        </div>
        <Progress 
          value={quota.usagePercentage} 
          className={cn("h-2", isPaused && "opacity-50")}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm">
          <span className="text-muted-foreground">Remaining: </span>
          <span className={cn("font-semibold", getStatusColor())}>
            {quota.remainingUploads} uploads
          </span>
          <span className="text-muted-foreground"> today</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => togglePause.mutate({ 
            channelId: quota.youtube_channel_id, 
            isPaused: !isPaused 
          })}
          disabled={togglePause.isPending}
        >
          {isPaused ? (
            <>
              <Play className="h-4 w-4 mr-1" />
              Resume
            </>
          ) : (
            <>
              <Pause className="h-4 w-4 mr-1" />
              Pause
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {quota.uploads_count} uploads today • Resets at midnight UTC
      </p>
    </div>
  );
}
