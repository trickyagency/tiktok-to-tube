import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useQuery } from '@tanstack/react-query';
import { 
  Clock, 
  Trash2, 
  ArrowRight,
  Calendar,
  Video,
  Pencil,
  Film,
  Youtube
} from 'lucide-react';
import { PublishSchedule, usePublishSchedules } from '@/hooks/usePublishSchedules';
import { useTikTokAccounts } from '@/hooks/useTikTokAccounts';
import { useYouTubeChannels } from '@/hooks/useYouTubeChannels';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ScheduleHistoryDialog } from './ScheduleHistoryDialog';
import { SchedulePreviewDialog } from './SchedulePreviewDialog';
import { AccountYouTubeSettingsDialog } from '@/components/tiktok/AccountYouTubeSettingsDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ScheduleCardProps {
  schedule: PublishSchedule;
  onEdit?: () => void;
}

export function ScheduleCard({ schedule, onEdit }: ScheduleCardProps) {
  const { toggleSchedule, deleteSchedule, isDeleting } = usePublishSchedules();
  const { data: tikTokAccounts = [] } = useTikTokAccounts();
  const { channels: youtubeChannels } = useYouTubeChannels();
  const [youtubeSettingsOpen, setYoutubeSettingsOpen] = useState(false);

  const tiktokAccount = tikTokAccounts.find(a => a.id === schedule.tiktok_account_id);
  const youtubeChannel = youtubeChannels.find(c => c.id === schedule.youtube_channel_id);
  
  const hasYouTubeSettings = !!(tiktokAccount?.youtube_description || tiktokAccount?.youtube_tags);

  // Fetch count of remaining unpublished videos
  const { data: remainingCount = 0 } = useQuery({
    queryKey: ['schedule-remaining', schedule.tiktok_account_id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('scraped_videos')
        .select('*', { count: 'exact', head: true })
        .eq('tiktok_account_id', schedule.tiktok_account_id)
        .eq('is_published', false);

      if (error) throw error;
      return count || 0;
    },
  });

  const handleToggle = async () => {
    await toggleSchedule({ id: schedule.id, is_active: !schedule.is_active });
  };

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
    <Card className={`overflow-hidden ${!schedule.is_active ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold truncate">{schedule.schedule_name}</h3>
              <Badge variant={schedule.is_active ? 'default' : 'secondary'}>
                {schedule.is_active ? 'Active' : 'Paused'}
              </Badge>
            </div>

            {/* Source → Destination */}
            <div className="flex items-center gap-2 text-sm mb-3">
              <span className="text-muted-foreground">
                @{tiktokAccount?.username || 'Unknown'}
              </span>
              {hasYouTubeSettings && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-600/50">
                  Configured
                </Badge>
              )}
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {youtubeChannel?.channel_title || 'Unknown Channel'}
              </span>
            </div>

            {/* Schedule Details */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Video className="h-3.5 w-3.5" />
                {schedule.publish_times.length} video{schedule.publish_times.length > 1 ? 's' : ''}/day
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatTimes(schedule.publish_times)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {schedule.timezone}
              </span>
              <span className="flex items-center gap-1">
                <Film className="h-3.5 w-3.5" />
                {remainingCount} remaining
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <SchedulePreviewDialog schedule={schedule} />
            <ScheduleHistoryDialog schedule={schedule} />
            
            {tiktokAccount && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => setYoutubeSettingsOpen(true)}
                    className={hasYouTubeSettings ? 'text-red-600' : ''}
                  >
                    <Youtube className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  YouTube description & tags
                </TooltipContent>
              </Tooltip>
            )}
            
            {onEdit && (
              <Button size="icon" variant="ghost" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            
            <Switch
              checked={schedule.is_active}
              onCheckedChange={handleToggle}
            />
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Schedule?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete "{schedule.schedule_name}". 
                    Queued videos from this schedule will remain in the queue.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteSchedule(schedule.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        
        {tiktokAccount && (
          <AccountYouTubeSettingsDialog
            account={tiktokAccount}
            open={youtubeSettingsOpen}
            onOpenChange={setYoutubeSettingsOpen}
          />
        )}
      </CardContent>
    </Card>
  );
}
