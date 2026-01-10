import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, ArrowRight, Video, Youtube, Clock, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Insight {
  id: string;
  message: string;
  icon: React.ElementType;
  link?: string;
  priority: 'high' | 'medium' | 'low';
}

interface DashboardInsightsCardProps {
  queuedCount: number;
  newVideosCount: number;
  failedCount: number;
  channelsNeedingReconnect: number;
}

const DashboardInsightsCard = ({
  queuedCount,
  newVideosCount,
  failedCount,
  channelsNeedingReconnect,
}: DashboardInsightsCardProps) => {
  const insights: Insight[] = [];

  // Generate insights based on data
  if (channelsNeedingReconnect > 0) {
    insights.push({
      id: 'reconnect',
      message: `${channelsNeedingReconnect} YouTube channel${channelsNeedingReconnect > 1 ? 's' : ''} need${channelsNeedingReconnect === 1 ? 's' : ''} reconnection`,
      icon: Youtube,
      link: '/dashboard/youtube',
      priority: 'high',
    });
  }

  if (failedCount > 0) {
    insights.push({
      id: 'failed',
      message: `${failedCount} upload${failedCount > 1 ? 's' : ''} failed - review and retry`,
      icon: Clock,
      link: '/dashboard/queue?status=failed',
      priority: 'high',
    });
  }

  if (queuedCount > 0) {
    insights.push({
      id: 'queue',
      message: `${queuedCount} video${queuedCount > 1 ? 's' : ''} ready to publish`,
      icon: Video,
      link: '/dashboard/queue',
      priority: 'medium',
    });
  }

  if (newVideosCount > 0) {
    insights.push({
      id: 'new',
      message: `${newVideosCount} new video${newVideosCount > 1 ? 's' : ''} scraped today`,
      icon: Sparkles,
      link: '/dashboard/tiktok',
      priority: 'low',
    });
  }

  // If no insights, show a positive message
  if (insights.length === 0) {
    insights.push({
      id: 'all-good',
      message: 'Everything is running smoothly!',
      icon: Sparkles,
      priority: 'low',
    });
  }

  const getPriorityStyles = (priority: Insight['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium':
        return 'bg-primary/10 text-primary border-primary/20';
      default:
        return 'bg-muted text-muted-foreground border-transparent';
    }
  };

  return (
    <Card className="border-0 stat-gradient-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          Smart Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {insights.slice(0, 4).map((insight) => {
          const content = (
            <div
              className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${getPriorityStyles(insight.priority)} ${
                insight.link ? 'hover:opacity-80 cursor-pointer group' : ''
              }`}
            >
              <insight.icon className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs flex-1">{insight.message}</span>
              {insight.link && (
                <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          );

          return insight.link ? (
            <Link key={insight.id} to={insight.link}>
              {content}
            </Link>
          ) : (
            <div key={insight.id}>{content}</div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default DashboardInsightsCard;
