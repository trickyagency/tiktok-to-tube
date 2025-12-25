import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, setHours, setMinutes, isAfter } from 'date-fns';
import { Eye, Video, Clock, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PublishSchedule } from '@/hooks/usePublishSchedules';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SchedulePreviewDialogProps {
  schedule: PublishSchedule;
}

interface ScrapedVideo {
  id: string;
  title: string | null;
  thumbnail_url: string | null;
  scraped_at: string;
  view_count: number | null;
  like_count: number | null;
}

function calculateNextUploadTimes(
  publishTimes: string[],
  videoCount: number
): Date[] {
  const times: Date[] = [];
  const sortedTimes = [...publishTimes].sort();
  const now = new Date();
  let currentDate = new Date();

  while (times.length < videoCount) {
    for (const time of sortedTimes) {
      if (times.length >= videoCount) break;

      const [hours, minutes] = time.split(':').map(Number);
      let uploadTime = setMinutes(setHours(currentDate, hours), minutes);

      // If we're on the first day, skip times that have already passed
      if (format(currentDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')) {
        if (!isAfter(uploadTime, now)) {
          continue;
        }
      }

      times.push(uploadTime);
    }
    currentDate = addDays(currentDate, 1);
    currentDate = setHours(setMinutes(currentDate, 0), 0);
  }

  return times;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return `Today ${format(date, 'h:mm a')}`;
  } else if (diffDays === 1) {
    return `Tomorrow ${format(date, 'h:mm a')}`;
  } else {
    return format(date, 'MMM d, h:mm a');
  }
}

export function SchedulePreviewDialog({ schedule }: SchedulePreviewDialogProps) {
  const [open, setOpen] = useState(false);

  // Fetch unpublished videos for this schedule's TikTok account (oldest first)
  const { data: upcomingVideos = [], isLoading: loadingVideos } = useQuery({
    queryKey: ['schedule-preview-videos', schedule.id, schedule.tiktok_account_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scraped_videos')
        .select('id, title, thumbnail_url, scraped_at, view_count, like_count')
        .eq('tiktok_account_id', schedule.tiktok_account_id)
        .eq('is_published', false)
        .order('scraped_at', { ascending: true })
        .limit(10);

      if (error) throw error;
      return data as ScrapedVideo[];
    },
    enabled: open,
  });

  // Check which videos are already in the queue
  const { data: queuedVideoIds = [], isLoading: loadingQueue } = useQuery({
    queryKey: ['schedule-preview-queue', schedule.tiktok_account_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('publish_queue')
        .select('scraped_video_id')
        .in('status', ['queued', 'processing']);

      if (error) throw error;
      return data.map(item => item.scraped_video_id);
    },
    enabled: open,
  });

  const isLoading = loadingVideos || loadingQueue;
  const estimatedTimes = calculateNextUploadTimes(schedule.publish_times, upcomingVideos.length);

  const formatTimes = (times: string[]) => {
    return times.map(time => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    }).join(', ');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost">
                <Eye className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Preview upcoming uploads</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upload Preview
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {schedule.schedule_name}
          </p>
        </DialogHeader>

        {/* Schedule info */}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground border-b pb-3">
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {formatTimes(schedule.publish_times)}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {schedule.timezone}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : upcomingVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Video className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground font-medium">No videos remaining</p>
            <p className="text-xs text-muted-foreground mt-1">
              All videos from this account have been published
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              <strong>{upcomingVideos.length}</strong> videos ready to upload (oldest first)
            </p>

            <ScrollArea className="max-h-[350px] pr-4">
              <div className="space-y-3">
                {upcomingVideos.map((video, index) => {
                  const isInQueue = queuedVideoIds.includes(video.id);
                  const isNextUp = index === 0 && !isInQueue;
                  const estimatedTime = estimatedTimes[index];

                  return (
                    <div
                      key={video.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                    >
                      {/* Thumbnail */}
                      {video.thumbnail_url ? (
                        <img
                          src={video.thumbnail_url}
                          alt=""
                          className="w-16 h-10 object-cover rounded flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-10 bg-muted rounded flex items-center justify-center flex-shrink-0">
                          <Video className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {video.title || 'Untitled Video'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            {video.view_count?.toLocaleString() || 0} views
                          </span>
                          {estimatedTime && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {isInQueue ? 'In queue' : formatRelativeTime(estimatedTime)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Badge */}
                      {isNextUp && (
                        <Badge variant="default" className="text-xs flex-shrink-0">
                          Next Up
                        </Badge>
                      )}
                      {isInQueue && (
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          In Queue
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              💡 Videos are uploaded oldest-first based on scrape date. The schedule triggers at each configured time.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
