import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Trash2,
  RotateCcw,
  ExternalLink,
  Youtube,
  ArrowRight,
  Music2
} from 'lucide-react';
import { QueueItemWithDetails, usePublishQueue } from '@/hooks/usePublishQueue';
import { format } from 'date-fns';
import { UploadProgressBar } from './UploadProgressBar';
interface QueueVideoCardProps {
  item: QueueItemWithDetails;
}

export function QueueVideoCard({ item }: QueueVideoCardProps) {
  const { cancelQueueItem, retryQueueItem } = usePublishQueue();

  const getStatusBadge = () => {
    switch (item.status) {
      case 'published':
        return (
          <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Published
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Queued
          </Badge>
        );
    }
  };

  const scheduledDate = new Date(item.scheduled_for);
  const isOverdue = scheduledDate < new Date() && item.status === 'queued';

  return (
    <Card className={`overflow-hidden transition-all ${item.status === 'processing' ? 'ring-2 ring-primary/30 animate-pulse' : ''}`}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Thumbnail */}
          <div className="relative w-24 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
            {item.scraped_video?.thumbnail_url ? (
              <img
                src={item.scraped_video.thumbnail_url}
                alt={item.scraped_video.title || 'Video'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Youtube className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            {/* Processing overlay */}
            {item.status === 'processing' && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-medium truncate text-sm">
                  {item.scraped_video?.title || 'Untitled Video'}
                </h4>
                {/* TikTok → YouTube flow indicator */}
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={item.scraped_video?.tiktok_account?.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px] bg-gradient-to-br from-pink-500 to-purple-600 text-white">
                        <Music2 className="h-2.5 w-2.5" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate max-w-[100px]">
                      @{item.scraped_video?.tiktok_account?.username || 'unknown'}
                    </span>
                  </div>
                  <ArrowRight className="h-3 w-3 flex-shrink-0 text-muted-foreground/50" />
                  <div className="flex items-center gap-1">
                    <Youtube className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                    <span className="truncate max-w-[100px]">
                      {item.youtube_channel?.channel_title || 'Unknown Channel'}
                    </span>
                  </div>
                </div>
              </div>
              {getStatusBadge()}
            </div>

            {/* Progress Bar for Processing */}
            {item.status === 'processing' && (
              <UploadProgressBar 
                phase={item.progress_phase} 
                percentage={item.progress_percentage || 0}
                className="mt-3"
              />
            )}

            {/* Schedule Time (hidden during processing) */}
            {item.status !== 'processing' && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span className={isOverdue ? 'text-amber-500' : ''}>
                  {format(scheduledDate, 'MMM d, yyyy • h:mm a')}
                  {isOverdue && ' (overdue)'}
                </span>
              </div>
            )}

            {/* Error Message */}
            {item.status === 'failed' && item.error_message && (
              <p className="text-xs text-destructive mt-2 line-clamp-1">
                Error: {item.error_message}
              </p>
            )}

            {/* YouTube Link for published */}
            {item.status === 'published' && item.youtube_video_url && (
              <a
                href={item.youtube_video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
              >
                <ExternalLink className="h-3 w-3" />
                View on YouTube
              </a>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1">
            {item.status === 'failed' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => retryQueueItem(item.id)}
                className="h-8 px-2"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            {(item.status === 'queued' || item.status === 'failed') && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => cancelQueueItem(item.id)}
                className="h-8 px-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
