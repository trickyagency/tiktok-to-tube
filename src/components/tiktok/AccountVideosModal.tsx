import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Eye, Heart, MessageCircle, Share2, ExternalLink, Youtube } from 'lucide-react';
import { useScrapedVideos, ScrapedVideo } from '@/hooks/useScrapedVideos';
import { TikTokAccount } from '@/hooks/useTikTokAccounts';
import { QueueVideoToYouTube } from '@/components/queue/QueueVideoToYouTube';

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
    <div className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group">
      <a
        href={video.video_url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative w-24 h-32 shrink-0 rounded-md overflow-hidden bg-muted"
      >
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title ? `TikTok video thumbnail: ${video.title}` : 'TikTok video thumbnail'}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No thumb
          </div>
        )}
        {video.is_published && (
          video.youtube_video_url ? (
            <a
              href={video.youtube_video_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="absolute top-1 right-1"
            >
              <Badge className="text-xs bg-red-600 hover:bg-red-700 text-white cursor-pointer flex items-center gap-1">
                <Youtube className="h-3 w-3" />
                YouTube
              </Badge>
            </a>
          ) : (
            <Badge className="absolute top-1 right-1 text-xs" variant="secondary">
              Published
            </Badge>
          )
        )}
      </a>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <a
            href={video.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-0"
          >
            <p className="text-sm font-medium line-clamp-2">{video.title || 'Untitled video'}</p>
          </a>
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

        <div className="flex items-center justify-between mt-2">
          {video.duration && (
            <p className="text-xs text-muted-foreground">
              {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
            </p>
          )}
          {!video.is_published && video.download_url && (
            <QueueVideoToYouTube video={video} />
          )}
        </div>
      </div>
    </div>
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

  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (open) setPage(1);
  }, [open, account?.id]);

  const total = videos?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageVideos = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return videos?.slice(start, start + PAGE_SIZE) ?? [];
  }, [page, videos]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            Videos from @{account?.username}
            {typeof total === 'number' && (
              <Badge variant="secondary" className="ml-2">
                {total} videos
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
          ) : total > 0 ? (
            <div className="space-y-1">
              {pageVideos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No videos scraped yet</p>
            </div>
          )}
        </ScrollArea>

        {!isLoading && total > PAGE_SIZE && (
          <div className="pt-2">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.max(1, p - 1));
                    }}
                    className={page <= 1 ? 'pointer-events-none opacity-50' : undefined}
                  />
                </PaginationItem>

                {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                  const p = idx + 1;
                  return (
                    <PaginationItem key={p}>
                      <PaginationLink
                        href="#"
                        isActive={p === page}
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(p);
                        }}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.min(totalPages, p + 1));
                    }}
                    className={page >= totalPages ? 'pointer-events-none opacity-50' : undefined}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>

            <p className="mt-2 text-xs text-muted-foreground text-center">
              Page {page} of {totalPages}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
