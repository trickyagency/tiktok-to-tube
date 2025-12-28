import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { History, ExternalLink, Video } from 'lucide-react';
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

interface ScheduleHistoryDialogProps {
  schedule: PublishSchedule;
}

export function ScheduleHistoryDialog({ schedule }: ScheduleHistoryDialogProps) {
  const [open, setOpen] = useState(false);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['schedule-history', schedule.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('publish_queue')
        .select(`
          id,
          status,
          processed_at,
          youtube_video_url,
          scraped_video:scraped_videos(title, thumbnail_url),
          youtube_channel:youtube_channels(channel_title)
        `)
        .eq('schedule_id', schedule.id)
        .in('status', ['published', 'failed'])
        .order('processed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost">
                <History className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>View upload history</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Upload History
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {schedule.schedule_name}
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Video className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No uploads yet</p>
            <p className="text-xs text-muted-foreground">
              Videos uploaded via this schedule will appear here
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  {item.scraped_video?.thumbnail_url ? (
                    <img
                      src={item.scraped_video.thumbnail_url}
                      alt=""
                      className="w-16 h-10 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-10 bg-muted rounded flex items-center justify-center">
                      <Video className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {item.scraped_video?.title || 'Untitled Video'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.processed_at
                        ? format(new Date(item.processed_at), 'MMM d, yyyy h:mm a')
                        : 'Processing...'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={item.status === 'published' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {item.status === 'published' ? 'Uploaded' : 'Failed'}
                    </Badge>

                    {item.youtube_video_url && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={item.youtube_video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{item.youtube_video_url.includes('/shorts/') ? 'Watch Short' : 'Watch Video'}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
