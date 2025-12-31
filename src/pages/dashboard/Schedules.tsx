import { useState, useEffect } from 'react';
import { Calendar, RefreshCw, TrendingUp, Activity, CheckCircle2 } from 'lucide-react';
import { usePublishSchedules, PublishSchedule } from '@/hooks/usePublishSchedules';
import { useScheduleAnalytics } from '@/hooks/useScheduleAnalytics';
import { useTikTokAccounts } from '@/hooks/useTikTokAccounts';
import { useYouTubeChannels } from '@/hooks/useYouTubeChannels';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateScheduleDialog } from '@/components/schedules/CreateScheduleDialog';
import { EditScheduleDialog } from '@/components/schedules/EditScheduleDialog';
import { ScheduleCard } from '@/components/schedules/ScheduleCard';

const Schedules = () => {
  const { schedules, isLoading, refetch } = usePublishSchedules();
  const { data: overviewStats, isLoading: statsLoading } = useScheduleAnalytics();
  const { data: tikTokAccounts = [] } = useTikTokAccounts();
  const { channels: youTubeChannels } = useYouTubeChannels();
  const [editingSchedule, setEditingSchedule] = useState<PublishSchedule | null>(null);

  useEffect(() => {
    refetch();
  }, []);

  const handleEditSchedule = (schedule: PublishSchedule) => {
    setEditingSchedule(schedule);
  };

  // Enrich schedules with account and channel data
  const enrichedSchedules = schedules.map((schedule) => {
    const tikTokAccount = tikTokAccounts.find(acc => acc.id === schedule.tiktok_account_id);
    const youTubeChannel = youTubeChannels.find(ch => ch.id === schedule.youtube_channel_id);
    return {
      ...schedule,
      tiktok_account: tikTokAccount ? {
        username: tikTokAccount.username,
        avatar_url: tikTokAccount.avatar_url,
        display_name: tikTokAccount.display_name,
      } : undefined,
      youtube_channel: youTubeChannel ? {
        channel_title: youTubeChannel.channel_title,
        channel_thumbnail: youTubeChannel.channel_thumbnail,
      } : undefined,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Publishing Schedules</h1>
          <p className="text-muted-foreground">
            Automate your video publishing with scheduled uploads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <CreateScheduleDialog />
        </div>
      </div>

      {/* Overview Stats */}
      {(statsLoading || (overviewStats && overviewStats.totalSchedules > 0)) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statsLoading ? (
            <>
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-24" />
              ))}
            </>
          ) : overviewStats && (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs font-medium">Active Schedules</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {overviewStats.activeSchedules}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      / {overviewStats.totalSchedules}
                    </span>
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Activity className="h-4 w-4" />
                    <span className="text-xs font-medium">Uploads This Month</span>
                  </div>
                  <p className="text-2xl font-bold">{overviewStats.totalUploadsThisMonth}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-medium">Avg Success Rate</span>
                  </div>
                  <p className={`text-2xl font-bold ${
                    overviewStats.avgSuccessRate >= 90 
                      ? 'text-green-600 dark:text-green-400' 
                      : overviewStats.avgSuccessRate >= 70 
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-destructive'
                  }`}>
                    {overviewStats.avgSuccessRate.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs font-medium">Status</span>
                  </div>
                  <p className="text-lg font-semibold">
                    {overviewStats.activeSchedules > 0 ? (
                      <span className="text-green-600 dark:text-green-400">Running</span>
                    ) : (
                      <span className="text-muted-foreground">Paused</span>
                    )}
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Schedules List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Your Schedules
          </CardTitle>
          <CardDescription>
            Manage your automated publishing schedules
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : enrichedSchedules.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No schedules yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first schedule to start automating your video uploads
              </p>
              <CreateScheduleDialog />
            </div>
          ) : (
            <div className="space-y-4">
              {enrichedSchedules.map((schedule) => (
                <ScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                  onEdit={() => handleEditSchedule(schedule)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Schedule Dialog */}
      <EditScheduleDialog
        schedule={editingSchedule}
        isOpen={!!editingSchedule}
        onClose={() => setEditingSchedule(null)}
        onSuccess={() => {
          setEditingSchedule(null);
          refetch();
        }}
      />
    </div>
  );
};

export default Schedules;
