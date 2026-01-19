import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Eye, Heart, MessageCircle, Share2, ExternalLink, Youtube, Upload, Video, CheckSquare } from 'lucide-react';
import { useScrapedVideos, ScrapedVideo } from '@/hooks/useScrapedVideos';
import { TikTokAccount } from '@/hooks/useTikTokAccounts';
import { QueueVideoToYouTube } from '@/components/queue/QueueVideoToYouTube';
import { MarkAsPublishedDialog } from './MarkAsPublishedDialog';

type VideoFilter = 'all' | 'not_uploaded' | 'uploaded';

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
  const [markAsPublishedOpen, setMarkAsPublishedOpen] = useState(false);

  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<VideoFilter>('all');

  useEffect(() => {
    if (open) {
      setPage(1);
      setFilter('all');
    }
  }, [open, account?.id]);

  // Filter videos based on selected tab
  const filteredVideos = useMemo(() => {
    if (!videos) return [];
    switch (filter) {
      case 'uploaded':
        return videos.filter(v => v.is_published);
      case 'not_uploaded':
        return videos.filter(v => !v.is_published);
      default:
        return videos;
    }
  }, [videos, filter]);

  // Count for each filter
  const counts = useMemo(() => ({
    all: videos?.length ?? 0,
    uploaded: videos?.filter(v => v.is_published).length ?? 0,
    not_uploaded: videos?.filter(v => !v.is_published).length ?? 0
  }), [videos]);

  const total = filteredVideos.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Reset to page 1 when filter changes
  useEffect(() => {
    setPage(1);
  }, [filter]);

  const pageVideos = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredVideos.slice(start, start + PAGE_SIZE);
  }, [page, filteredVideos]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              Videos from @{account?.username}
              <Badge variant="secondary">
                {counts.all} total
              </Badge>
            </DialogTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setMarkAsPublishedOpen(true)}
              className="shrink-0"
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              Mark as Published
            </Button>
          </div>
        </DialogHeader>

        {/* Filter tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as VideoFilter)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="text-xs gap-1.5">
              <Video className="h-3.5 w-3.5" />
              All ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="not_uploaded" className="text-xs gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              Not Uploaded ({counts.not_uploaded})
            </TabsTrigger>
            <TabsTrigger value="uploaded" className="text-xs gap-1.5">
              <Youtube className="h-3.5 w-3.5" />
              Uploaded ({counts.uploaded})
            </TabsTrigger>
          </TabsList>
        </Tabs>

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

      {account && (
        <MarkAsPublishedDialog
          account={account as any}
          open={markAsPublishedOpen}
          onOpenChange={setMarkAsPublishedOpen}
        />
      )}
    </Dialog>
  );
}
