import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pause, Play, Upload } from 'lucide-react';
import { QuotaUsage, useToggleChannelPause } from '@/hooks/useYouTubeQuota';
import { cn } from '@/lib/utils';

const DAILY_UPLOAD_LIMIT = 6;

interface QuotaIndicatorProps {
  quota: QuotaUsage;
}

export function QuotaIndicator({ quota }: QuotaIndicatorProps) {
  const togglePause = useToggleChannelPause();
  
  const uploadsUsed = quota.uploads_count;
  const uploadsRemaining = Math.max(0, DAILY_UPLOAD_LIMIT - uploadsUsed);
  const uploadPercentage = (uploadsUsed / DAILY_UPLOAD_LIMIT) * 100;
  
  const isWarning = uploadsRemaining <= 2 && uploadsRemaining > 0;
  const isExhausted = uploadsRemaining <= 0;
  const isPaused = quota.is_paused;

  const getStatusColor = () => {
    if (isPaused) return 'text-muted-foreground';
    if (isExhausted) return 'text-destructive';
    if (isWarning) return 'text-warning';
    return 'text-success';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Upload className={cn("h-4 w-4", getStatusColor())} />
          <span className={cn("text-sm font-medium", getStatusColor())}>
            {uploadsUsed} / {DAILY_UPLOAD_LIMIT} uploads today
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isPaused && (
            <Badge variant="secondary" className="text-xs">Paused</Badge>
          )}
          {isExhausted && !isPaused && (
            <Badge variant="destructive" className="text-xs">Limit Reached</Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => togglePause.mutate({ 
              channelId: quota.youtube_channel_id, 
              isPaused: !isPaused 
            })}
            disabled={togglePause.isPending}
          >
            {isPaused ? (
              <>
                <Play className="h-3 w-3 mr-1" />
                Resume
              </>
            ) : (
              <>
                <Pause className="h-3 w-3 mr-1" />
                Pause
              </>
            )}
          </Button>
        </div>
      </div>
      
      <Progress 
        value={uploadPercentage} 
        className={cn("h-1.5", isPaused && "opacity-50")}
      />
      
      <p className="text-xs text-muted-foreground">
        {uploadsRemaining} remaining • Resets at midnight UTC
      </p>
    </div>
  );
}
