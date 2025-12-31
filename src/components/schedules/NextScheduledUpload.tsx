import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Timer, Calendar, ArrowRight, Youtube } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QueueItemWithDetails } from '@/hooks/usePublishQueue';

interface NextScheduledUploadProps {
  queuedItems: QueueItemWithDetails[];
  isLoading?: boolean;
}

function formatCountdown(targetDate: Date): string {
  const diff = targetDate.getTime() - Date.now();
  if (diff <= 0) return "Starting soon...";
  
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h ${minutes}m`;
  }
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  
  return `${seconds}s`;
}

export function NextScheduledUpload({ queuedItems, isLoading }: NextScheduledUploadProps) {
  const [countdown, setCountdown] = useState<string>('');
  
  // Get the next queued item (first one sorted by scheduled_for)
  const nextItem = queuedItems.find(item => item.status === 'queued');
  const processingItem = queuedItems.find(item => item.status === 'processing');
  
  // Use processing item if there is one, otherwise next queued
  const displayItem = processingItem || nextItem;
  
  useEffect(() => {
    if (!displayItem || displayItem.status === 'processing') return;
    
    const targetDate = new Date(displayItem.scheduled_for);
    
    const updateCountdown = () => {
      setCountdown(formatCountdown(targetDate));
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [displayItem]);

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold">Next Scheduled Upload</span>
          </div>
          <div className="animate-pulse space-y-3">
            <div className="flex gap-4">
              <div className="w-24 h-16 bg-muted rounded-md" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!displayItem) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold">Next Scheduled Upload</span>
          </div>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 mb-3">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No uploads scheduled</p>
            <p className="text-xs text-muted-foreground mt-1">Videos will appear here when added to the queue</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const video = displayItem.scraped_video;
  const channel = displayItem.youtube_channel;
  const scheduledDate = new Date(displayItem.scheduled_for);
  const isProcessing = displayItem.status === 'processing';

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <span className="font-semibold">Next Scheduled Upload</span>
          </div>
          {isProcessing && (
            <Badge variant="secondary" className="bg-primary/10 text-primary animate-pulse">
              Processing...
            </Badge>
          )}
        </div>
        
        <div className="flex gap-4">
          {/* Video Thumbnail */}
          <div className="relative flex-shrink-0">
            {video?.thumbnail_url ? (
              <img 
                src={video.thumbnail_url} 
                alt={video.title || 'Video thumbnail'}
                className="w-28 h-20 object-cover rounded-md border border-border/50"
              />
            ) : (
              <div className="w-28 h-20 bg-muted rounded-md flex items-center justify-center border border-border/50">
                <Youtube className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>
          
          {/* Video Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <h4 className="font-medium text-sm line-clamp-2 leading-tight">
              {video?.title || 'Untitled video'}
            </h4>
            
            {channel && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Youtube className="h-3.5 w-3.5 text-destructive" />
                <span className="truncate">{channel.channel_title || 'YouTube Channel'}</span>
              </div>
            )}
            
            {/* Countdown */}
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                {isProcessing ? 'Uploading now...' : countdown}
              </span>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            {format(scheduledDate, 'MMM d, yyyy')} at {format(scheduledDate, 'h:mm a')}
          </span>
          <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
            <Link to="/dashboard/queue">
              View Queue
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
