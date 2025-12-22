import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import WelcomeBanner from '@/components/dashboard/WelcomeBanner';
import AnimatedStatCard from '@/components/dashboard/AnimatedStatCard';
import { DashboardLoadingState } from '@/components/dashboard/DashboardSkeletons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useYouTubeChannels } from '@/hooks/useYouTubeChannels';
import { useTikTokAccounts } from '@/hooks/useTikTokAccounts';
import { usePublishQueue } from '@/hooks/usePublishQueue';
import { useUploadHistory } from '@/hooks/useUploadHistory';
import { Youtube, Video, Calendar, TrendingUp, Plus, ArrowRight, Activity } from 'lucide-react';
import { format } from 'date-fns';

const Dashboard = () => {
  const { channels: youtubeChannels, isLoading: isLoadingYouTube } = useYouTubeChannels();
  const { data: tikTokAccounts = [], isLoading: isLoadingTikTok } = useTikTokAccounts();
  const { queue: queueItems, isLoading: isLoadingQueue } = usePublishQueue();
  const { history: uploadHistory, isLoading: isLoadingHistory } = useUploadHistory();

  const isLoading = isLoadingYouTube || isLoadingTikTok || isLoadingQueue || isLoadingHistory;

  const pendingCount = queueItems.filter(item => item.status === 'queued').length;
  const completedCount = uploadHistory.length;

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

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {stats.map((stat) => (
          <AnimatedStatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            description={stat.description}
            gradientClass={stat.gradientClass}
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
              <div className="space-y-4">
                {recentActivity.map((item) => (
                  <div key={item.id} className="flex items-start gap-4 p-3 rounded-lg bg-muted/30">
                    {item.scraped_video?.thumbnail_url ? (
                      <img 
                        src={item.scraped_video.thumbnail_url} 
                        alt="" 
                        className="w-16 h-10 rounded object-cover bg-muted"
                      />
                    ) : (
                      <div className="w-16 h-10 rounded bg-muted flex items-center justify-center">
                        <Video className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {item.scraped_video?.title || 'Untitled Video'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          item.status === 'completed' 
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
                ))}
              </div>
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
    </DashboardLayout>
  );
};

export default Dashboard;
