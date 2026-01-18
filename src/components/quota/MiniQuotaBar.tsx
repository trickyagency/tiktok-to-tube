import { Progress } from '@/components/ui/progress';
import { BarChart3, Pause, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuotaUsage } from '@/hooks/useYouTubeQuota';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MiniQuotaBarProps {
  quota: QuotaUsage | undefined;
  dailyLimit: number;
  isUnlimited?: boolean;
}

// Calculate time until midnight PT (Pacific Time)
function getTimeUntilReset(): string {
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
  
  return `${minutesUntil}m`;
}

export function MiniQuotaBar({ quota, dailyLimit, isUnlimited }: MiniQuotaBarProps) {
  const uploadsUsed = quota?.uploads_count ?? 0;
  const maxUploads = isUnlimited ? Infinity : dailyLimit;
  const uploadsRemaining = isUnlimited ? Infinity : Math.max(0, maxUploads - uploadsUsed);
  const usagePercent = isUnlimited ? 0 : Math.min(100, (uploadsUsed / maxUploads) * 100);
  const isPaused = quota?.is_paused ?? false;
  
  const getStatusColor = () => {
    if (isPaused) return 'bg-muted-foreground';
    if (uploadsRemaining <= 0 && !isUnlimited) return 'bg-destructive';
    if (uploadsRemaining <= 2 && !isUnlimited) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getTextColor = () => {
    if (isPaused) return 'text-muted-foreground';
    if (uploadsRemaining <= 0 && !isUnlimited) return 'text-destructive';
    if (uploadsRemaining <= 2 && !isUnlimited) return 'text-amber-500';
    return 'text-emerald-600';
  };

  const resetTime = getTimeUntilReset();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 text-xs cursor-help">
            {isPaused ? (
              <Pause className="h-3 w-3 text-muted-foreground" />
            ) : (
              <BarChart3 className={cn("h-3 w-3", getTextColor())} />
            )}
            
            {isUnlimited ? (
              <span className={cn("font-medium", getTextColor())}>
                {uploadsUsed} today • Unlimited
              </span>
            ) : (
              <>
                <div className="flex-1 min-w-[60px] max-w-[100px] h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-500 rounded-full",
                      getStatusColor(),
                      isPaused && "opacity-50"
                    )}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                <span className={cn("whitespace-nowrap font-medium tabular-nums", getTextColor())}>
                  {uploadsRemaining}/{maxUploads}
                </span>
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px]">
          <div className="space-y-1 text-xs">
            <p className="font-medium">
              {isPaused ? 'Uploads Paused' : 
               uploadsRemaining <= 0 && !isUnlimited ? 'Quota Exhausted' :
               'Daily Upload Quota'}
            </p>
            <p className="text-muted-foreground">
              {isUnlimited 
                ? `${uploadsUsed} uploads today • No limit`
                : `${uploadsUsed} of ${maxUploads} uploads used today`
              }
            </p>
            {!isUnlimited && (
              <div className="flex items-center gap-1 text-muted-foreground pt-1 border-t border-border/50">
                <Clock className="h-3 w-3" />
                <span>Resets in {resetTime} (midnight PT)</span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
