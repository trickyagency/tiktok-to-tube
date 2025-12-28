import { format, formatDistanceToNow } from 'date-fns';
import { ExternalLink, FileText, Play, Youtube } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QueueItemWithDetails } from '@/hooks/usePublishQueue';
import { UploadLogDetails } from './UploadLogDetails';
import { cn } from '@/lib/utils';

interface UploadHistoryCardProps {
  item: QueueItemWithDetails;
}

const UploadHistoryCard = ({ item }: UploadHistoryCardProps) => {
  const uploadedAt = item.processed_at ? new Date(item.processed_at) : new Date(item.updated_at);
  const timeAgo = formatDistanceToNow(uploadedAt, { addSuffix: true });
  const formattedDate = format(uploadedAt, 'MMM d, yyyy \'at\' h:mm a');
  const isShort = item.youtube_video_url?.includes('/shorts/') ?? false;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="flex gap-4 p-4">
          {/* Thumbnail */}
          <div className={cn(
            "relative flex-shrink-0 rounded-md overflow-hidden bg-muted",
            isShort ? "w-14 h-24" : "w-32 h-20"
          )}>
            {item.scraped_video?.thumbnail_url ? (
              <>
                <img
                  src={item.scraped_video.thumbnail_url}
                  alt={item.scraped_video.title || 'Video thumbnail'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                  <Play className="h-8 w-8 text-white" />
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Youtube className="h-8 w-8 text-muted-foreground/50" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm line-clamp-2">
                  {item.scraped_video?.title || 'Untitled Video'}
                </h4>
                {item.youtube_video_url && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px] px-1.5 py-0 h-4 shrink-0",
                      isShort 
                        ? "border-pink-500/50 text-pink-600 bg-pink-500/10" 
                        : "border-blue-500/50 text-blue-600 bg-blue-500/10"
                    )}
                  >
                    {isShort ? 'Short' : 'Video'}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {item.youtube_channel?.channel_thumbnail && (
                  <img
                    src={item.youtube_channel.channel_thumbnail}
                    alt=""
                    className="w-4 h-4 rounded-full"
                  />
                )}
                <span>{item.youtube_channel?.channel_title || 'Unknown Channel'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  Uploaded {timeAgo}
                </Badge>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {formattedDate}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <UploadLogDetails 
                  queueItemId={item.id}
                  trigger={
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                      <FileText className="h-3.5 w-3.5" />
                      Logs
                    </Button>
                  }
                />
                {item.youtube_video_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    asChild
                  >
                    <a
                      href={item.youtube_video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Youtube className="h-3.5 w-3.5 text-red-500" />
                      {item.youtube_video_url.includes('/shorts/') ? 'Watch Short' : 'Watch Video'}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadHistoryCard;
