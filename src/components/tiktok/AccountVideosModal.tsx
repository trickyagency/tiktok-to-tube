import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, Heart, MessageCircle, Share2, ExternalLink } from 'lucide-react';
import { useScrapedVideos, ScrapedVideo } from '@/hooks/useScrapedVideos';
import { TikTokAccount } from '@/hooks/useTikTokAccounts';

interface AccountVideosModalProps {
  account: TikTokAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function VideoCard({ video }: { video: ScrapedVideo }) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <a
      href={video.video_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      <div className="relative w-24 h-32 shrink-0 rounded-md overflow-hidden bg-muted">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title || 'Video thumbnail'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No thumb
          </div>
        )}
        {video.is_published && (
          <Badge className="absolute top-1 right-1 text-xs" variant="secondary">
            Published
          </Badge>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium line-clamp-2">
            {video.title || 'Untitled video'}
          </p>
          <ExternalLink className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
        </div>

        <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {formatNumber(video.view_count)}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {formatNumber(video.like_count)}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            {formatNumber(video.comment_count)}
          </span>
          <span className="flex items-center gap-1">
            <Share2 className="h-3 w-3" />
            {formatNumber(video.share_count)}
          </span>
        </div>

        {video.duration && (
          <p className="text-xs text-muted-foreground mt-1">
            {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
          </p>
        )}
      </div>
    </a>
  );
}

function VideoSkeleton() {
  return (
    <div className="flex gap-3 p-3">
      <Skeleton className="w-24 h-32 rounded-md" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}

export function AccountVideosModal({ account, open, onOpenChange }: AccountVideosModalProps) {
  const { data: videos, isLoading } = useScrapedVideos(account?.id || null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            Videos from @{account?.username}
            {videos && (
              <Badge variant="secondary" className="ml-2">
                {videos.length} videos
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <VideoSkeleton key={i} />
              ))}
            </div>
          ) : videos && videos.length > 0 ? (
            <div className="space-y-1">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No videos scraped yet</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
