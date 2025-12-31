import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pause, Play, Upload, Infinity as InfinityIcon } from 'lucide-react';
import { QuotaUsage, useToggleChannelPause } from '@/hooks/useYouTubeQuota';
import { cn } from '@/lib/utils';

interface QuotaIndicatorProps {
  quota: QuotaUsage;
  dailyLimit: number;
  isUnlimited?: boolean;
}

export function QuotaIndicator({ quota, dailyLimit, isUnlimited }: QuotaIndicatorProps) {
  const togglePause = useToggleChannelPause();
  
  const uploadsUsed = quota.uploads_count;
  const uploadsRemaining = isUnlimited ? Infinity : Math.max(0, dailyLimit - uploadsUsed);
  const uploadPercentage = isUnlimited ? 0 : (uploadsUsed / dailyLimit) * 100;
  
  const isWarning = !isUnlimited && uploadsRemaining <= 2 && uploadsRemaining > 0;
  const isExhausted = !isUnlimited && uploadsRemaining <= 0;
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
            {isUnlimited ? (
              <>
                {uploadsUsed} uploads today
                <Badge variant="secondary" className="ml-2 text-xs">
                  <InfinityIcon className="h-3 w-3 mr-1" />
                  Unlimited
                </Badge>
              </>
            ) : (
              `${uploadsUsed} / ${dailyLimit} uploads today`
            )}
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
      
      {!isUnlimited && (
        <Progress 
          value={uploadPercentage} 
          className={cn("h-1.5", isPaused && "opacity-50")}
        />
      )}
      
      <p className="text-xs text-muted-foreground">
        {isUnlimited 
          ? 'Unlimited uploads • Owner access' 
          : `${uploadsRemaining} remaining • Resets at midnight UTC`
        }
      </p>
    </div>
  );
}
