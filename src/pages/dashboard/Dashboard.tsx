import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import WelcomeBanner from '@/components/dashboard/WelcomeBanner';
import WelcomeModal from '@/components/dashboard/WelcomeModal';
import AnimatedStatCard from '@/components/dashboard/AnimatedStatCard';
import PlatformStatsWidget from '@/components/dashboard/PlatformStatsWidget';
import TodayProgressWidget from '@/components/dashboard/TodayProgressWidget';
import DashboardInsightsCard from '@/components/dashboard/DashboardInsightsCard';
import AchievementBadges from '@/components/dashboard/AchievementBadges';
import KeyboardHints from '@/components/dashboard/KeyboardHints';
import { DashboardLoadingState } from '@/components/dashboard/DashboardSkeletons';
import { QuickFixConfirmDialog } from '@/components/dashboard/QuickFixConfirmDialog';
import { UploadLogDetails } from '@/components/history/UploadLogDetails';
import { RenewalReminderBanner } from '@/components/subscriptions/RenewalReminderBanner';
import { UploadProgressWidget } from '@/components/dashboard/UploadProgressWidget';
import { useWelcomeModal } from '@/hooks/useWelcomeModal';
import { useWelcomeEmail } from '@/hooks/useWelcomeEmail';
import { usePublishSchedules } from '@/hooks/usePublishSchedules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useYouTubeChannels } from '@/hooks/useYouTubeChannels';
import { useTikTokAccounts } from '@/hooks/useTikTokAccounts';
import { usePublishQueue } from '@/hooks/usePublishQueue';
import { useUploadHistory } from '@/hooks/useUploadHistory';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Youtube, Video, Calendar, TrendingUp, Plus, ArrowRight, Activity, AlertCircle, CheckCircle2, Loader2, Clock, Trophy } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { format, isToday, isYesterday, startOfToday, subDays, startOfWeek } from 'date-fns';

const Dashboard = () => {
  const [showQuickFixDialog, setShowQuickFixDialog] = useState(false);
  const { showWelcome, dismissWelcome } = useWelcomeModal();
  
  // Trigger welcome email for new users (runs once per user)
  useWelcomeEmail();

  useEffect(() => {
    document.title = "Dashboard | RepostFlow";
  }, []);
  
  const { channels: youtubeChannels, isLoading: isLoadingYouTube } = useYouTubeChannels();
  const { data: tikTokAccounts = [], isLoading: isLoadingTikTok } = useTikTokAccounts();
  const { schedules = [] } = usePublishSchedules();
  const { 
    queue: queueItems, 
    isLoading: isLoadingQueue, 
    mismatchedCount,
    mismatchedItems,
    reassignMismatched, 
    isReassigning,
  } = usePublishQueue();
  const { history: uploadHistory, isLoading: isLoadingHistory } = useUploadHistory();
  const { data: analyticsData } = useAnalytics();

  const isLoading = isLoadingYouTube || isLoadingTikTok || isLoadingQueue || isLoadingHistory;

  // Computed stats
  const pendingCount = queueItems.filter(item => item.status === 'queued').length;
  const completedCount = uploadHistory.filter(item => item.status === 'published').length;
  const activeSchedules = schedules.filter(s => s.is_active).length;

  // Platform-wide stats from analytics
  const platformPublishedVideos = analyticsData?.platformStats?.publishedVideos || completedCount;
  const totalUsers = analyticsData?.totalUsers || 0;

  // Today's progress
  const todayUploads = useMemo(() => {
    return uploadHistory.filter(item => 
      item.status === 'published' && isToday(new Date(item.processed_at || item.created_at))
    ).length;
  }, [uploadHistory]);

  const yesterdayUploads = useMemo(() => {
    const yesterday = subDays(startOfToday(), 1);
    return uploadHistory.filter(item => 
      item.status === 'published' && isYesterday(new Date(item.processed_at || item.created_at))
    ).length;
  }, [uploadHistory]);

  // Weekly published count
  const publishedThisWeek = useMemo(() => {
    const weekStart = startOfWeek(new Date());
    return uploadHistory.filter(item => 
      item.status === 'published' && new Date(item.processed_at || item.created_at) >= weekStart
    ).length;
  }, [uploadHistory]);

  // Daily goal (based on active schedules)
  const dailyGoal = useMemo(() => {
    return schedules.reduce((sum, s) => sum + (s.videos_per_day || 0), 0) || 5;
  }, [schedules]);

  // Last sync time (most recent activity)
  const lastSync = useMemo(() => {
    if (uploadHistory.length === 0) return null;
    return new Date(uploadHistory[0].created_at);
  }, [uploadHistory]);

  // Check for YouTube channels that need reconnection
  const channelsNeedingReconnect = youtubeChannels.filter(channel => 
    channel.auth_status === 'failed' || 
    channel.auth_status === 'token_revoked' ||
    (channel.auth_status === 'connected' && !channel.refresh_token)
  );

  // Primary stats (5 cards - conversion focused)
  const stats = [
    { 
      title: 'Platform Videos', 
      value: platformPublishedVideos, 
      icon: TrendingUp, 
      description: 'Published globally',
      gradientClass: 'stat-gradient-1',
      href: '/dashboard/history',
    },
    { 
      title: 'Your Published', 
      value: completedCount, 
      icon: Trophy, 
      description: 'Your success stories',
      gradientClass: 'stat-gradient-2',
      href: '/dashboard/history',
    },
    { 
      title: 'YouTube Channels', 
      value: youtubeChannels.length, 
      icon: Youtube, 
      description: 'Connected channels',
      gradientClass: 'stat-gradient-3',
      href: '/dashboard/youtube',
    },
    { 
      title: 'TikTok Accounts', 
      value: tikTokAccounts.length, 
      icon: Video, 
      description: 'Monitored accounts',
      gradientClass: 'stat-gradient-4',
      href: '/dashboard/tiktok',
    },
    { 
      title: 'Videos Queued', 
      value: pendingCount, 
      icon: Calendar, 
      description: 'Ready to publish',
      gradientClass: 'stat-gradient-1',
      href: '/dashboard/queue',
    },
  ];

  // Dynamic quick actions based on user state
  const quickActions = useMemo(() => {
    const actions = [];
    
    if (youtubeChannels.length === 0) {
      actions.push({
        title: 'Connect YouTube Channel',
        description: 'Required to start publishing',
        icon: Youtube,
        link: '/dashboard/youtube',
        color: 'text-destructive',
        highlight: true,
      });
    } else if (channelsNeedingReconnect.length > 0) {
      actions.push({
        title: 'Reconnect YouTube',
        description: `${channelsNeedingReconnect.length} channel${channelsNeedingReconnect.length > 1 ? 's' : ''} need attention`,
        icon: Youtube,
        link: '/dashboard/youtube',
        color: 'text-warning',
        highlight: true,
      });
    }
    
    if (tikTokAccounts.length === 0) {
      actions.push({
        title: 'Add TikTok Account',
        description: 'Monitor a TikTok creator',
        icon: Video,
        link: '/dashboard/tiktok',
        color: 'text-pink-500',
      });
    }
    
    if (pendingCount > 0) {
      actions.push({
        title: 'View Queue',
        description: `${pendingCount} video${pendingCount > 1 ? 's' : ''} pending`,
        icon: Calendar,
        link: '/dashboard/queue',
        color: 'text-primary',
      });
    }

    // Add view history if user has published content
    if (completedCount > 0 && actions.length < 3) {
      actions.push({
        title: 'View History',
        description: `${completedCount} published video${completedCount > 1 ? 's' : ''}`,
        icon: TrendingUp,
        link: '/dashboard/history',
        color: 'text-success',
      });
    }
    
    // Fill with default actions if needed
    if (youtubeChannels.length > 0 && actions.length < 3) {
      actions.push({
        title: 'Add YouTube Channel',
        description: 'Connect another channel',
        icon: Youtube,
        link: '/dashboard/youtube',
        color: 'text-red-500',
      });
    }
    
    if (tikTokAccounts.length > 0 && actions.length < 3) {
      actions.push({
        title: 'Add TikTok Account',
        description: 'Monitor more creators',
        icon: Video,
        link: '/dashboard/tiktok',
        color: 'text-pink-500',
      });
    }

    return actions.slice(0, 4);
  }, [youtubeChannels, tikTokAccounts, pendingCount, channelsNeedingReconnect, completedCount]);

  const recentActivity = uploadHistory.slice(0, 5);

  if (isLoading) {
    return (
      <DashboardLayout
        title="Dashboard"
        description="Overview of your TikTok to YouTube automation"
      >
        <DashboardLoadingState />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Dashboard"
      description="Overview of your TikTok to YouTube automation"
    >
      {/* Welcome Banner with Setup Progress */}
      <WelcomeBanner
        youtubeCount={youtubeChannels.length}
        tiktokCount={tikTokAccounts.length}
        hasSchedule={queueItems.length > 0}
        publishedToday={todayUploads}
        publishedThisWeek={completedCount}
      />

      {/* Subscription Renewal Reminder Banner */}
      <RenewalReminderBanner />

      {/* Reconnection Warning Banner */}
      {channelsNeedingReconnect.length > 0 && (
        <Alert className="mb-6 border-amber-500/50 bg-amber-500/10">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-600 dark:text-amber-400">
            YouTube Channel{channelsNeedingReconnect.length > 1 ? 's' : ''} Need Reconnection
          </AlertTitle>
          <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-muted-foreground">
              {channelsNeedingReconnect.length === 1 
                ? `"${channelsNeedingReconnect[0].channel_title || 'Unnamed Channel'}" needs to be reconnected to continue uploading.`
                : `${channelsNeedingReconnect.length} channels need to be reconnected to continue uploading.`
              }
            </span>
            <Button variant="outline" size="sm" asChild className="shrink-0 border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10">
              <Link to="/dashboard/youtube">
                Reconnect Now
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Primary Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {stats.map((stat, index) => (
          <div key={stat.title} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
            <AnimatedStatCard
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              description={stat.description}
              gradientClass={stat.gradientClass}
              href={stat.href}
            />
          </div>
        ))}
      </div>

      {/* Insights Row - 4 cards for conversion focus */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
          <PlatformStatsWidget
            totalPlatformVideos={platformPublishedVideos}
            totalUsers={totalUsers}
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '250ms' }}>
          <TodayProgressWidget
            uploaded={todayUploads}
            goal={dailyGoal}
            yesterdayCount={yesterdayUploads}
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
          <DashboardInsightsCard
            queuedCount={pendingCount}
            newVideosCount={0}
            publishedThisWeek={publishedThisWeek}
            totalPublished={completedCount}
          />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '350ms' }}>
          <AchievementBadges
            publishedCount={completedCount}
            youtubeChannels={youtubeChannels.length}
            tiktokAccounts={tikTokAccounts.length}
            schedulesActive={activeSchedules}
          />
        </div>
      </div>

      {/* Real-time Upload Progress Widget */}
      <UploadProgressWidget />

      {/* Quick Actions + Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="lg:col-span-1 border-0 bg-card/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="h-4 w-4 text-primary" />
                Quick Actions
              </CardTitle>
              <KeyboardHints />
            </div>
            <CardDescription className="text-xs">Get started with common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                to={action.link}
                onClick={action.onClick}
                className={`group flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  action.highlight 
                    ? 'border-primary/30 bg-primary/5 hover:bg-primary/10' 
                    : 'border-transparent hover:border-border hover:bg-muted/50'
                }`}
              >
                <div className={`p-2 rounded-lg bg-muted/80 ${action.color}`}>
                  <action.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{action.title}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2 border-0 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-primary" />
                Recent Activity
              </CardTitle>
              <CardDescription className="text-xs">Latest uploads and actions</CardDescription>
            </div>
            {recentActivity.length > 0 && (
              <Button variant="ghost" size="sm" asChild className="text-xs">
                <Link to="/dashboard/history">View All</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <TooltipProvider>
                <div className="space-y-2">
                  {recentActivity.map((item, index) => (
                    <UploadLogDetails
                      key={item.id}
                      queueItemId={item.id}
                      trigger={
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div 
                              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors animate-fade-in"
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              {/* Thumbnail */}
                              {item.scraped_video?.thumbnail_url ? (
                                <img 
                                  src={item.scraped_video.thumbnail_url} 
                                  alt="" 
                                  className="w-12 h-8 object-cover rounded"
                                />
                              ) : (
                                <div className="w-12 h-8 rounded bg-muted flex items-center justify-center">
                                  <Video className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              
                              {/* Status Icon */}
                              <div className="flex-shrink-0">
                                {item.status === 'published' ? (
                                  <CheckCircle2 className="h-4 w-4 text-success" />
                                ) : item.status === 'processing' ? (
                                  <Loader2 className="h-4 w-4 text-warning animate-spin" />
                                ) : (
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                              
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {item.scraped_video?.title || 'Untitled Video'}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-muted-foreground truncate">
                                    → {item.youtube_channel?.channel_title || 'Unknown'}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Timestamp & Status */}
                              <div className="flex flex-col items-end gap-1">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                  item.status === 'published' 
                                    ? 'bg-success/10 text-success'
                                    : item.status === 'processing'
                                      ? 'bg-warning/10 text-warning'
                                      : 'bg-muted text-muted-foreground'
                                }`}>
                                  {item.status}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {format(new Date(item.created_at), 'h:mm a')}
                                </span>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <p>Click for details</p>
                          </TooltipContent>
                        </Tooltip>
                      }
                    />
                  ))}
                </div>
              </TooltipProvider>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <Activity className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No activity yet. Connect your accounts to get started.
                </p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link to="/dashboard/youtube">Get Started</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Fix Confirmation Dialog */}
      <QuickFixConfirmDialog
        isOpen={showQuickFixDialog}
        onClose={() => setShowQuickFixDialog(false)}
        onConfirm={async () => {
          await reassignMismatched();
          setShowQuickFixDialog(false);
        }}
        isLoading={isReassigning}
        mismatchedItems={mismatchedItems}
        youtubeChannels={youtubeChannels}
      />

      {/* Welcome Modal for New Users */}
      <WelcomeModal isOpen={showWelcome} onClose={dismissWelcome} />
    </DashboardLayout>
  );
};

export default Dashboard;
