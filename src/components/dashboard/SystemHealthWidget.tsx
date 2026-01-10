import { CheckCircle2, AlertCircle, Wifi, Clock, Calendar, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format, formatDistanceToNow } from 'date-fns';

interface SystemHealthWidgetProps {
  youtubeConnected: number;
  tiktokConnected: number;
  activeSchedules: number;
  lastSync?: Date | null;
  hasErrors: boolean;
}

const SystemHealthWidget = ({
  youtubeConnected,
  tiktokConnected,
  activeSchedules,
  lastSync,
  hasErrors,
}: SystemHealthWidgetProps) => {
  const allConnected = youtubeConnected > 0 && tiktokConnected > 0;
  const isHealthy = allConnected && !hasErrors;

  const statusItems = [
    {
      label: 'API Status',
      status: isHealthy ? 'operational' : hasErrors ? 'degraded' : 'pending',
      icon: Wifi,
    },
    {
      label: 'YouTube',
      status: youtubeConnected > 0 ? 'connected' : 'disconnected',
      icon: CheckCircle2,
      count: youtubeConnected,
    },
    {
      label: 'TikTok',
      status: tiktokConnected > 0 ? 'connected' : 'disconnected',
      icon: CheckCircle2,
      count: tiktokConnected,
    },
    {
      label: 'Schedules',
      status: activeSchedules > 0 ? 'active' : 'none',
      icon: Calendar,
      count: activeSchedules,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
      case 'connected':
      case 'active':
        return 'bg-success';
      case 'degraded':
        return 'bg-warning';
      case 'pending':
      case 'disconnected':
      case 'none':
        return 'bg-muted-foreground/30';
      default:
        return 'bg-muted-foreground/30';
    }
  };

  return (
    <Card className="border-0 stat-gradient-1">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          System Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Overall Status */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
          <div className="relative">
            <span className={`h-2.5 w-2.5 rounded-full ${isHealthy ? 'bg-success' : hasErrors ? 'bg-warning' : 'bg-muted-foreground/50'} block`} />
            {isHealthy && (
              <span className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-success animate-ping opacity-75" />
            )}
          </div>
          <span className="text-sm font-medium">
            {isHealthy ? 'All systems operational' : hasErrors ? 'Issues detected' : 'Setup required'}
          </span>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-2 gap-2">
          {statusItems.map((item) => (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-background/30 hover:bg-background/50 transition-colors cursor-default">
                  <span className={`h-1.5 w-1.5 rounded-full ${getStatusColor(item.status)}`} />
                  <span className="text-xs text-muted-foreground truncate">{item.label}</span>
                  {item.count !== undefined && (
                    <span className="text-xs font-medium ml-auto">{item.count}</span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs capitalize">{item.status}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Last Sync */}
        {lastSync && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
            <Clock className="h-3 w-3" />
            <span>Last sync: {formatDistanceToNow(lastSync, { addSuffix: true })}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemHealthWidget;
