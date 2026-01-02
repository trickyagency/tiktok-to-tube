import { format, formatDistanceToNow } from 'date-fns';
import { ExternalLink, FileText, Youtube, CheckCircle, Clock, Play } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QueueItemWithDetails } from '@/hooks/usePublishQueue';
import { UploadLogDetails } from './UploadLogDetails';
import { cn } from '@/lib/utils';

interface UploadHistoryCardProps {
  item: QueueItemWithDetails;
  index?: number;
}

const UploadHistoryCard = ({ item, index = 0 }: UploadHistoryCardProps) => {
  const uploadedAt = item.processed_at ? new Date(item.processed_at) : new Date(item.updated_at);
  const timeAgo = formatDistanceToNow(uploadedAt, { addSuffix: true });
  const formattedDate = format(uploadedAt, 'MMM d, yyyy \'at\' h:mm a');
  const thumbnail = item.scraped_video?.thumbnail_url;

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden",
        "bg-card/80 backdrop-blur-xl",
        "border border-border/50 border-l-4 border-l-emerald-500",
        "shadow-lg shadow-black/5",
        "hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-0.5",
        "transition-all duration-300 ease-out",
        "animate-in fade-in slide-in-from-bottom-2"
      )}
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
    >
      {/* Top gradient stripe */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-emerald-500/50 via-transparent to-transparent" />
      
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Video Thumbnail */}
          <div className="relative w-20 h-14 rounded-lg overflow-hidden shrink-0 bg-muted">
            {thumbnail ? (
              <>
                <img 
                  src={thumbnail} 
                  alt="" 
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Play className="h-6 w-6 text-white fill-white" />
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Youtube className="h-6 w-6 text-muted-foreground/50" />
              </div>
            )}
            {/* Success badge */}
            <Badge className="absolute bottom-1 right-1 h-4 px-1 text-[9px] bg-emerald-500/90 text-white border-0 shadow-sm">
              <CheckCircle className="h-2 w-2 mr-0.5" />
              Done
            </Badge>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {item.scraped_video?.title || 'Untitled Video'}
            </h4>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              {item.youtube_channel?.channel_thumbnail && (
                <img
                  src={item.youtube_channel.channel_thumbnail}
                  alt=""
                  className="w-4 h-4 rounded-full ring-1 ring-border/50"
                />
              )}
              <span className="truncate">{item.youtube_channel?.channel_title || 'Unknown Channel'}</span>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
          <div className="flex items-center gap-2">
            <Badge 
              variant="secondary" 
              className="text-[10px] bg-muted/50 text-muted-foreground border border-border/30 backdrop-blur-sm"
            >
              <Clock className="h-2.5 w-2.5 mr-1" />
              {timeAgo}
            </Badge>
            <span className="text-[10px] text-muted-foreground/70 hidden sm:inline">
              {formattedDate}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <UploadLogDetails 
              queueItemId={item.id}
              trigger={
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2 gap-1 text-xs hover:bg-muted/50"
                >
                  <FileText className="h-3 w-3" />
                  Logs
                </Button>
              }
            />
            {(item.youtube_channel?.channel_handle || item.youtube_channel?.channel_id) && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 gap-1 text-xs border-border/50 hover:border-red-500/30 hover:bg-red-500/5"
                asChild
              >
                <a
                  href={item.youtube_channel.channel_handle 
                    ? `https://www.youtube.com/${item.youtube_channel.channel_handle}`
                    : `https://www.youtube.com/channel/${item.youtube_channel.channel_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Youtube className="h-3 w-3 text-red-500" />
                  <span className="hidden sm:inline">View</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadHistoryCard;
