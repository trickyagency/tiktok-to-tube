import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, ArrowRight, Video, Clock, Sparkles, TrendingUp, Rocket, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Insight {
  id: string;
  message: string;
  icon: React.ElementType;
  link?: string;
  priority: 'success' | 'positive' | 'info' | 'achievement';
}

interface DashboardInsightsCardProps {
  queuedCount: number;
  newVideosCount: number;
  publishedThisWeek?: number;
  totalPublished?: number;
}

const DashboardInsightsCard = ({
  queuedCount,
  newVideosCount,
  publishedThisWeek = 0,
  totalPublished = 0,
}: DashboardInsightsCardProps) => {
  const insights: Insight[] = [];

  // Positive insights only - no failures!
  if (publishedThisWeek > 0) {
    insights.push({
      id: 'published-week',
      message: `You published ${publishedThisWeek} video${publishedThisWeek > 1 ? 's' : ''} this week`,
      icon: TrendingUp,
      link: '/dashboard/history',
      priority: 'success',
    });
  }

  if (queuedCount > 0) {
    insights.push({
      id: 'queue',
      message: `${queuedCount} video${queuedCount > 1 ? 's' : ''} ready to publish`,
      icon: Video,
      link: '/dashboard/queue',
      priority: 'positive',
    });
  }

  // Time savings insight (estimate based on published count)
  const hoursSaved = Math.round((totalPublished * 5) / 60); // ~5 min per video
  if (hoursSaved > 0) {
    insights.push({
      id: 'time-saved',
      message: `Automation saved you ~${hoursSaved} hour${hoursSaved > 1 ? 's' : ''}`,
      icon: Timer,
      priority: 'info',
    });
  }

  if (newVideosCount > 0) {
    insights.push({
      id: 'new',
      message: `${newVideosCount} new video${newVideosCount > 1 ? 's' : ''} scraped`,
      icon: Sparkles,
      link: '/dashboard/tiktok',
      priority: 'positive',
    });
  }

  // Milestone insights
  const milestones = [10, 25, 50, 100, 250, 500, 1000];
  const nextMilestone = milestones.find(m => m > totalPublished);
  if (nextMilestone && totalPublished >= nextMilestone * 0.8) {
    insights.push({
      id: 'milestone',
      message: `Almost at ${nextMilestone} videos milestone!`,
      icon: Rocket,
      priority: 'achievement',
    });
  }

  // Default positive message
  if (insights.length === 0) {
    insights.push({
      id: 'ready',
      message: 'Ready to automate your content!',
      icon: Sparkles,
      priority: 'info',
    });
  }

  const getPriorityStyles = (priority: Insight['priority']) => {
    switch (priority) {
      case 'success':
        return 'bg-success/10 text-success border-success/20';
      case 'positive':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'achievement':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
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
