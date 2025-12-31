import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { 
  Clock, 
  Trash2, 
  ArrowRight,
  Calendar,
  Video,
  Pencil,
  Film,
  Youtube,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Activity,
  BarChart3,
  Settings2,
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react';
import { PublishSchedule, usePublishSchedules } from '@/hooks/usePublishSchedules';
import { useTikTokAccounts } from '@/hooks/useTikTokAccounts';
import { useYouTubeChannels } from '@/hooks/useYouTubeChannels';
import { useScheduleStats } from '@/hooks/useScheduleAnalytics';
import { useCurrentUserSubscription } from '@/hooks/useUserSubscription';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScheduleHistoryDialog } from './ScheduleHistoryDialog';
import { SchedulePreviewDialog } from './SchedulePreviewDialog';
import { ScheduleAnalyticsDialog } from './ScheduleAnalyticsDialog';
import { AccountYouTubeSettingsDialog } from '@/components/tiktok/AccountYouTubeSettingsDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';

interface ScheduleCardProps {
  schedule: PublishSchedule;
  onEdit?: () => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  showCheckbox?: boolean;
}

export function ScheduleCard({ schedule, onEdit, isSelected, onToggleSelect, showCheckbox }: ScheduleCardProps) {
  const { toggleSchedule, deleteSchedule, isDeleting } = usePublishSchedules();
  const { data: tikTokAccounts = [] } = useTikTokAccounts();
  const { channels: youtubeChannels } = useYouTubeChannels();
  const { data: subscription } = useCurrentUserSubscription();
  const [youtubeSettingsOpen, setYoutubeSettingsOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  
  const { data: stats } = useScheduleStats(schedule.id);

  const tiktokAccount = tikTokAccounts.find(a => a.id === schedule.tiktok_account_id);
  const youtubeChannel = youtubeChannels.find(c => c.id === schedule.youtube_channel_id);
  
  const hasYouTubeSettings = !!(tiktokAccount?.youtube_description || tiktokAccount?.youtube_tags);

  // Check if schedule exceeds subscription limit
  const maxVideosPerDay = subscription?.plan?.max_videos_per_day || 2;
  const scheduleVideosPerDay = schedule.publish_times?.length || 0;
  const exceedsLimit = scheduleVideosPerDay > maxVideosPerDay;

  // Check if user has active subscription
  const hasActiveSubscription = subscription?.status === 'active';

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

  const formatDuration = (ms: number): string => {
    if (ms === 0) return '-';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 90) return 'text-success';
    if (rate >= 70) return 'text-warning';
    return 'text-destructive';
  };

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
    <Card className={`overflow-hidden transition-all duration-200 ${
      schedule.is_active 
        ? 'bg-gradient-to-br from-background via-background to-primary/5 border-primary/20 shadow-sm' 
        : 'opacity-70 hover:opacity-100'
    } ${exceedsLimit ? 'border-warning/50' : ''} ${isSelected ? 'ring-2 ring-primary/50' : ''}`}>
      <CardContent className="p-5">
        <div className="flex gap-3">
          {showCheckbox && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelect}
              className="mt-1"
            />
          )}
          <div className="flex-1 min-w-0">
        {/* Subscription Limit Warning Banner */}
        {exceedsLimit && (
          <Alert variant="default" className="mb-4 border-warning/50 bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-sm">
                This schedule has <strong>{scheduleVideosPerDay} videos/day</strong> but your plan allows <strong>{maxVideosPerDay}/day</strong>. 
                Uploads beyond your limit may not be processed.
              </span>
              <Button variant="outline" size="sm" asChild className="border-warning/50 hover:bg-warning/10">
                <Link to="/dashboard/upgrade" className="gap-1">
                  Upgrade Plan
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-start justify-between gap-4">
          {/* Left side - Main content */}
          <div className="flex-1 min-w-0">
            {/* Header with name and status */}
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold truncate">{schedule.schedule_name}</h3>
              <Badge 
                variant={schedule.is_active ? 'default' : 'secondary'}
                className={schedule.is_active ? 'bg-success hover:bg-success/90' : ''}
              >
                {schedule.is_active && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
                {schedule.is_active ? 'Active' : 'Paused'}
              </Badge>
              {hasYouTubeSettings && (
                <Badge variant="outline" className="text-xs border-success/50 text-success">
                  <Settings2 className="h-3 w-3 mr-1" />
                  Configured
                </Badge>
              )}
              {!schedule.is_active && !hasActiveSubscription && (
                <Badge variant="outline" className="text-xs border-warning/50 text-warning">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Subscription Required
                </Badge>
              )}
            </div>

            {/* Source → Destination with avatars */}
            <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 border">
                  <AvatarImage src={tiktokAccount?.avatar_url || ''} />
                  <AvatarFallback className="text-xs bg-primary/10">
                    {tiktokAccount?.username?.charAt(0)?.toUpperCase() || 'T'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <p className="font-medium">@{tiktokAccount?.username || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">TikTok</p>
                </div>
              </div>
              
              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 border">
                  <AvatarImage src={youtubeChannel?.channel_thumbnail || ''} />
                  <AvatarFallback className="text-xs bg-destructive/10">
                    <Youtube className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <p className="font-medium truncate max-w-[150px]">
                    {youtubeChannel?.channel_title || 'Unknown Channel'}
                  </p>
                  <p className="text-xs text-muted-foreground">YouTube</p>
                </div>
              </div>
            </div>

            {/* Schedule Details */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-md bg-muted/50">
                <Video className="h-3.5 w-3.5 text-primary" />
                <span>{schedule.publish_times.length} video{schedule.publish_times.length > 1 ? 's' : ''}/day</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-md bg-muted/50">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>{formatTimes(schedule.publish_times)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-md bg-muted/50">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>{schedule.timezone}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-md bg-muted/50">
                <Film className="h-3.5 w-3.5 text-primary" />
                <span className={remainingCount === 0 ? 'text-warning' : ''}>
                  {remainingCount} remaining
                </span>
              </div>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <ScheduleAnalyticsDialog schedule={schedule} />
                  </span>
                </TooltipTrigger>
                <TooltipContent>Analytics</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <SchedulePreviewDialog schedule={schedule} />
                  </span>
                </TooltipTrigger>
                <TooltipContent>Preview Queue</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <ScheduleHistoryDialog schedule={schedule} />
                  </span>
                </TooltipTrigger>
                <TooltipContent>History</TooltipContent>
              </Tooltip>
              
              {tiktokAccount && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => setYoutubeSettingsOpen(true)}
                      className={hasYouTubeSettings ? 'text-destructive' : ''}
                    >
                      <Youtube className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>YouTube Settings</TooltipContent>
                </Tooltip>
              )}
              
              {onEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" onClick={onEdit}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit</TooltipContent>
                </Tooltip>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {schedule.is_active ? 'Active' : 'Paused'}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Switch
                        checked={schedule.is_active}
                        onCheckedChange={handleToggle}
                        disabled={!schedule.is_active && !hasActiveSubscription}
                      />
                    </span>
                  </TooltipTrigger>
                  {!schedule.is_active && !hasActiveSubscription && (
                    <TooltipContent>
                      <p>Active subscription required to enable schedules</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
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
        </div>
        
        {/* Inline Analytics */}
        {stats && stats.totalUploads > 0 && (
          <Collapsible open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full mt-4 text-muted-foreground hover:text-foreground border border-dashed border-border/50 hover:border-border"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
                {analyticsOpen ? (
                  <ChevronUp className="h-4 w-4 ml-auto" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-auto" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                    <Activity className="h-3.5 w-3.5" />
                    Total Uploads
                  </div>
                  <p className="text-xl font-bold">{stats.totalUploads}</p>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-br from-success/5 to-success/10 border border-success/10">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Success Rate
                  </div>
                  <p className={`text-xl font-bold ${getSuccessRateColor(stats.successRate)}`}>
                    {stats.successRate.toFixed(0)}%
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-br from-destructive/5 to-destructive/10 border border-destructive/10">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                    <XCircle className="h-3.5 w-3.5" />
                    Failed
                  </div>
                  <p className={`text-xl font-bold ${stats.failedUploads > 0 ? 'text-destructive' : ''}`}>
                    {stats.failedUploads}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-br from-info/5 to-info/10 border border-info/10">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                    <Clock className="h-3.5 w-3.5" />
                    Avg Time
                  </div>
                  <p className="text-xl font-bold">{formatDuration(stats.avgUploadDuration)}</p>
                </div>
              </div>
              {stats.lastUploadAt && (
                <p className="text-xs text-muted-foreground text-center mt-3 pt-3 border-t border-border/50">
                  Last upload: {formatDistanceToNow(new Date(stats.lastUploadAt), { addSuffix: true })}
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {tiktokAccount && (
          <AccountYouTubeSettingsDialog
            account={tiktokAccount}
            open={youtubeSettingsOpen}
            onOpenChange={setYoutubeSettingsOpen}
          />
        )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
