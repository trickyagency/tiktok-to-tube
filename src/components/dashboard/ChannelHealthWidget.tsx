import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  AlertCircle, 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle,
  RefreshCw,
  ShieldAlert,
  Wrench
} from 'lucide-react';
import { useAllChannelsHealth, getStatusDisplay } from '@/hooks/useChannelHealth';
import { useYouTubeChannels } from '@/hooks/useYouTubeChannels';

export function ChannelHealthWidget() {
  const { summary, healthByStatus, isLoading, refetch } = useAllChannelsHealth();
  const { channels } = useYouTubeChannels();

  // Calculate total issues
  const issuesCount = summary.issues_auth + summary.issues_quota + summary.issues_config + summary.issues_permission + summary.degraded;

  // Don't show if no channels or all healthy
  if (isLoading || !channels?.length || issuesCount === 0) {
    return null;
  }

  const getChannelName = (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    return channel?.channel_title || 'Unknown Channel';
  };

  const issueCategories = [
    { 
      status: 'issues_auth', 
      label: 'Auth Issues', 
      icon: AlertCircle, 
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      items: healthByStatus['issues_auth'] || []
    },
    { 
      status: 'issues_quota', 
      label: 'Quota Exceeded', 
      icon: AlertTriangle, 
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
      items: healthByStatus['issues_quota'] || []
    },
    { 
      status: 'issues_config', 
      label: 'Config Issues', 
      icon: Wrench, 
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      items: healthByStatus['issues_config'] || []
    },
    { 
      status: 'degraded', 
      label: 'Degraded', 
      icon: ShieldAlert, 
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
      items: healthByStatus['degraded'] || []
    },
  ].filter(cat => cat.items.length > 0);

  return (
    <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Wrench className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-base">Channels Needing Attention</CardTitle>
              <CardDescription className="text-xs">
                {issuesCount} channel{issuesCount > 1 ? 's' : ''} with issues
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {issueCategories.map((category) => (
            <div 
              key={category.status}
              className={cn(
                "p-3 rounded-xl border",
                category.bgColor,
                category.borderColor
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <category.icon className={cn("h-4 w-4", category.color)} />
                <span className={cn("text-sm font-medium", category.color)}>
                  {category.items.length} {category.label.toLowerCase()}
                </span>
              </div>
              <div className="space-y-1.5">
                {category.items.slice(0, 3).map((health) => (
                  <div 
                    key={health.channel_id}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="truncate max-w-[200px]">
                      • {getChannelName(health.channel_id)}
                    </span>
                    {health.last_error_message && (
                      <span className="text-muted-foreground truncate max-w-[150px]">
                        {health.last_error_message}
                      </span>
                    )}
                  </div>
                ))}
                {category.items.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{category.items.length - 3} more
                  </p>
                )}
              </div>
              
              {category.status === 'degraded' && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Will auto-recover
                </p>
              )}
            </div>
          ))}
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-4" 
          asChild
        >
          <Link to="/dashboard/youtube">
            View All Channels
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
