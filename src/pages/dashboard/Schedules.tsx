import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, TrendingUp, Activity, CheckCircle2, Play, ListVideo, AlertTriangle, ArrowUpRight, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePublishSchedules, PublishSchedule } from '@/hooks/usePublishSchedules';
import { useScheduleAnalytics } from '@/hooks/useScheduleAnalytics';
import { usePublishQueue } from '@/hooks/usePublishQueue';
import { useTikTokAccounts } from '@/hooks/useTikTokAccounts';
import { useYouTubeChannels } from '@/hooks/useYouTubeChannels';
import { useCurrentUserSubscription } from '@/hooks/useUserSubscription';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CreateScheduleDialog } from '@/components/schedules/CreateScheduleDialog';
import { EditScheduleDialog } from '@/components/schedules/EditScheduleDialog';
import { ScheduleCard } from '@/components/schedules/ScheduleCard';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import AnimatedStatCard from '@/components/dashboard/AnimatedStatCard';

const Schedules = () => {
  const { schedules, isLoading, refetch } = usePublishSchedules();
  const { data: overviewStats, isLoading: statsLoading } = useScheduleAnalytics();
  const { queue } = usePublishQueue();
  const { data: tikTokAccounts = [] } = useTikTokAccounts();
  const { channels: youTubeChannels } = useYouTubeChannels();
  const { data: subscription } = useCurrentUserSubscription();
  const navigate = useNavigate();
  const [editingSchedule, setEditingSchedule] = useState<PublishSchedule | null>(null);

  // Check subscription limits
  const maxVideosPerDay = subscription?.plan?.max_videos_per_day || 2;
  const schedulesExceedingLimit = schedules.filter(
    s => (s.publish_times?.length || 0) > maxVideosPerDay
  );

  useEffect(() => {
    document.title = "Publishing Schedules | RepostFlow";
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

  // Separate active and paused schedules
  const activeSchedules = enrichedSchedules.filter(s => s.is_active);
  const pausedSchedules = enrichedSchedules.filter(s => !s.is_active);

  // Count videos in queue
  const queuedCount = queue?.filter(q => q.status === 'queued' || q.status === 'processing').length || 0;

  return (
    <DashboardLayout
      title="Publishing Schedules"
      description="Automate your video publishing with scheduled uploads"
    >
      <div className="space-y-6">
        {/* Subscription Limit Warning */}
        {schedulesExceedingLimit.length > 0 && (
          <Alert variant="default" className="border-warning/50 bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertTitle className="text-warning">Subscription Limit Exceeded</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-2 flex-wrap">
              <span>
                {schedulesExceedingLimit.length} schedule{schedulesExceedingLimit.length > 1 ? 's' : ''} exceed{schedulesExceedingLimit.length === 1 ? 's' : ''} your 
                plan's limit of {maxVideosPerDay} videos/day. Some uploads may not be processed.
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

        {/* Header Actions */}
        <div className="flex items-center justify-end gap-2">
          <CreateScheduleDialog />
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statsLoading ? (
            <>
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-[120px]" />
              ))}
            </>
          ) : (
            <>
              <AnimatedStatCard
                title="Active Schedules"
                value={overviewStats?.activeSchedules || 0}
                icon={Calendar}
                description={`${overviewStats?.totalSchedules || 0} total schedules`}
                gradientClass="stat-gradient-1"
              />
              <AnimatedStatCard
                title="Uploads This Month"
                value={overviewStats?.totalUploadsThisMonth || 0}
                icon={Activity}
                description="Videos published"
                gradientClass="stat-gradient-2"
                href="/dashboard/history"
              />
              <AnimatedStatCard
                title="Success Rate"
                value={Math.round(overviewStats?.avgSuccessRate || 0)}
                icon={CheckCircle2}
                description="Average success rate"
                gradientClass="stat-gradient-3"
              />
              <AnimatedStatCard
                title="Videos Queued"
                value={queuedCount}
                icon={ListVideo}
                description="Waiting to upload"
                gradientClass="stat-gradient-4"
                href="/dashboard/queue"
              />
            </>
          )}
        </div>

        {/* View Publishing Queue Widget */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">View Publishing Queue</h3>
                  <p className="text-sm text-muted-foreground">See all videos scheduled to be uploaded</p>
                </div>
              </div>
              <Button 
                variant="outline"
                asChild
              >
                <Link to="/dashboard/queue">
                  View Queue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Active Schedules Section */}
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : enrichedSchedules.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No schedules yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Create your first schedule to start automating your video uploads from TikTok to YouTube
                </p>
                <div className="flex flex-col items-center gap-4">
                  <CreateScheduleDialog />
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs">1</span>
                      Connect a YouTube channel
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs">2</span>
                      Add a TikTok account to scrape
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs">3</span>
                      Create a schedule and let it run
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Active Schedules */}
            {activeSchedules.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <h2 className="text-lg font-semibold">Active Schedules</h2>
                  <span className="text-sm text-muted-foreground">({activeSchedules.length})</span>
                </div>
                <div className="space-y-4">
                  {activeSchedules.map((schedule) => (
                    <ScheduleCard
                      key={schedule.id}
                      schedule={schedule}
                      onEdit={() => handleEditSchedule(schedule)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Paused Schedules */}
            {pausedSchedules.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                  <h2 className="text-lg font-semibold">Paused Schedules</h2>
                  <span className="text-sm text-muted-foreground">({pausedSchedules.length})</span>
                </div>
                <div className="space-y-4">
                  {pausedSchedules.map((schedule) => (
                    <ScheduleCard
                      key={schedule.id}
                      schedule={schedule}
                      onEdit={() => handleEditSchedule(schedule)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

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
    </DashboardLayout>
  );
};

export default Schedules;
