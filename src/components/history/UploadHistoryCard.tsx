import { format, formatDistanceToNow } from 'date-fns';
import { ExternalLink, FileText, Youtube } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QueueItemWithDetails } from '@/hooks/usePublishQueue';
import { UploadLogDetails } from './UploadLogDetails';

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
        <div className="p-4">
          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm line-clamp-2">
                  {item.scraped_video?.title || 'Untitled Video'}
                </h4>
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
                {(item.youtube_channel?.channel_handle || item.youtube_channel?.channel_id) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    asChild
                  >
                    <a
                      href={item.youtube_channel.channel_handle 
                        ? `https://www.youtube.com/${item.youtube_channel.channel_handle}`
                        : `https://www.youtube.com/channel/${item.youtube_channel.channel_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Youtube className="h-3.5 w-3.5 text-red-500" />
                      View Channel
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
