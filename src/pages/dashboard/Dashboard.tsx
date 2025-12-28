import { useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import WelcomeBanner from '@/components/dashboard/WelcomeBanner';
import AnimatedStatCard from '@/components/dashboard/AnimatedStatCard';
import { DashboardLoadingState } from '@/components/dashboard/DashboardSkeletons';
import { QuickFixConfirmDialog } from '@/components/dashboard/QuickFixConfirmDialog';
import { UploadLogDetails } from '@/components/history/UploadLogDetails';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useYouTubeChannels } from '@/hooks/useYouTubeChannels';
import { useTikTokAccounts } from '@/hooks/useTikTokAccounts';
import { usePublishQueue } from '@/hooks/usePublishQueue';
import { useUploadHistory } from '@/hooks/useUploadHistory';
import { Youtube, Video, Calendar, TrendingUp, Plus, ArrowRight, Activity, AlertTriangle, AlertCircle, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { format } from 'date-fns';

const Dashboard = () => {
  const [showQuickFixDialog, setShowQuickFixDialog] = useState(false);
  
  const { channels: youtubeChannels, isLoading: isLoadingYouTube } = useYouTubeChannels();
  const { data: tikTokAccounts = [], isLoading: isLoadingTikTok } = useTikTokAccounts();
  const { 
    queue: queueItems, 
    isLoading: isLoadingQueue, 
    mismatchedCount,
    mismatchedItems,
    reassignMismatched, 
    isReassigning 
  } = usePublishQueue();
  const { history: uploadHistory, isLoading: isLoadingHistory } = useUploadHistory();

  const isLoading = isLoadingYouTube || isLoadingTikTok || isLoadingQueue || isLoadingHistory;

  const pendingCount = queueItems.filter(item => item.status === 'queued').length;
  const completedCount = uploadHistory.length;

  // Check for YouTube channels that need reconnection
  const channelsNeedingReconnect = youtubeChannels.filter(channel => {
    const isTokenExpired = channel.token_expires_at 
      ? new Date(channel.token_expires_at) < new Date() 
      : false;
      
    return (
      channel.auth_status === 'failed' || 
      channel.auth_status === 'token_revoked' ||
      (channel.auth_status === 'connected' && !channel.refresh_token) ||
      (channel.auth_status === 'connected' && isTokenExpired)
    );
  });

  const stats = [
    { 
      title: 'YouTube Channels', 
      value: youtubeChannels.length, 
      icon: Youtube, 
      description: 'Connected channels',
      gradientClass: 'stat-gradient-1'
    },
    { 
      title: 'TikTok Accounts', 
      value: tikTokAccounts.length, 
      icon: Video, 
      description: 'Monitored accounts',
      gradientClass: 'stat-gradient-2'
    },
    { 
      title: 'Videos Queued', 
      value: pendingCount, 
      icon: Calendar, 
      description: 'Pending uploads',
      gradientClass: 'stat-gradient-3'
    },
    { 
      title: 'Videos Published', 
      value: completedCount, 
      icon: TrendingUp, 
      description: 'Total uploads',
      gradientClass: 'stat-gradient-4'
    },
    { 
      title: 'Queue Issues', 
      value: mismatchedCount, 
      icon: AlertTriangle, 
      description: mismatchedCount === 0 ? 'No mismatches' : 'Account mismatches',
      gradientClass: mismatchedCount > 0 ? 'bg-amber-500/10 border border-amber-500/20' : 'stat-gradient-1',
      isWarning: mismatchedCount > 0,
      href: '/dashboard/queue?showMismatched=true',
      tooltip: 'Account mismatches occur when a video from one TikTok account is queued to a YouTube channel linked to a different TikTok account. Click to view and resolve these issues.',
      action: mismatchedCount > 0 ? {
        label: 'Quick Fix',
        onClick: () => setShowQuickFixDialog(true),
        isLoading: isReassigning,
      } : undefined,
    },
  ];

  const quickActions = [
    {
      title: 'Add YouTube Channel',
      description: 'Connect a new YouTube channel',
      icon: Youtube,
      link: '/dashboard/youtube',
      color: 'text-red-500',
    },
    {
      title: 'Add TikTok Account',
      description: 'Monitor a TikTok creator',
      icon: Video,
      link: '/dashboard/tiktok',
      color: 'text-pink-500',
    },
    {
      title: 'View Queue',
      description: `${pendingCount} videos pending`,
      icon: Calendar,
      link: '/dashboard/queue',
      color: 'text-blue-500',
    },
  ];

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
      />

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

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
        {stats.map((stat) => (
          <AnimatedStatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            description={stat.description}
            gradientClass={stat.gradientClass}
            isWarning={'isWarning' in stat ? stat.isWarning : false}
            href={'href' in stat ? stat.href : undefined}
            tooltip={'tooltip' in stat ? stat.tooltip : undefined}
            action={'action' in stat ? stat.action : undefined}
          />
        ))}
      </div>

      {/* Quick Actions + Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>Get started with common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                to={action.link}
                className="group flex items-center gap-4 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-all"
              >
                <div className={`p-2 rounded-lg bg-muted ${action.color}`}>
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
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest uploads and actions</CardDescription>
            </div>
            {recentActivity.length > 0 && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard/history">View All</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <TooltipProvider>
                <div className="space-y-4">
                  {recentActivity.map((item) => (
                    <UploadLogDetails
                      key={item.id}
                      queueItemId={item.id}
                      trigger={
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors">
                              <div className="mt-0.5">
                                {item.status === 'published' ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                ) : item.status === 'failed' ? (
                                  <XCircle className="h-5 w-5 text-destructive" />
                                ) : item.status === 'processing' ? (
                                  <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
                                ) : (
                                  <Clock className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {item.scraped_video?.title || 'Untitled Video'}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    item.status === 'published' 
                                      ? 'bg-success/10 text-success'
                                      : item.status === 'failed'
                                        ? 'bg-destructive/10 text-destructive'
                                        : 'bg-muted text-muted-foreground'
                                  }`}>
                                    {item.status}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(item.created_at), 'MMM d, h:mm a')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>Uploaded to: {item.youtube_channel?.channel_title || 'Unknown Channel'}</p>
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
    </DashboardLayout>
  );
};

export default Dashboard;
