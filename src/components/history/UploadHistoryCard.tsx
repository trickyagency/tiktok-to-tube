import { format, formatDistanceToNow } from 'date-fns';
import { ExternalLink, Play, Youtube } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QueueItemWithDetails } from '@/hooks/usePublishQueue';

interface UploadHistoryCardProps {
  item: QueueItemWithDetails;
}

const UploadHistoryCard = ({ item }: UploadHistoryCardProps) => {
  const uploadedAt = item.processed_at ? new Date(item.processed_at) : new Date(item.updated_at);
  const timeAgo = formatDistanceToNow(uploadedAt, { addSuffix: true });
  const formattedDate = format(uploadedAt, 'MMM d, yyyy \'at\' h:mm a');

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="flex gap-4 p-4">
          {/* Thumbnail */}
          <div className="relative flex-shrink-0 w-32 h-20 rounded-md overflow-hidden bg-muted">
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
              <h4 className="font-medium text-sm line-clamp-2 mb-1">
                {item.scraped_video?.title || 'Untitled Video'}
              </h4>
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
                    Watch
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadHistoryCard;
