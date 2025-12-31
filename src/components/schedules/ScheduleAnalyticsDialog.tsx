import { useState } from 'react';
import { format } from 'date-fns';
import { BarChart3, TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, Activity } from 'lucide-react';
import { useScheduleStats, useScheduleTrends } from '@/hooks/useScheduleAnalytics';
import { PublishSchedule } from '@/hooks/usePublishSchedules';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface ScheduleAnalyticsDialogProps {
  schedule: PublishSchedule;
}

function formatDuration(ms: number): string {
  if (ms === 0) return '-';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  variant = 'default' 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType;
  variant?: 'default' | 'success' | 'destructive' | 'warning';
}) {
  const variantClasses = {
    default: 'text-foreground',
    success: 'text-green-600 dark:text-green-400',
    destructive: 'text-destructive',
    warning: 'text-yellow-600 dark:text-yellow-400',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Icon className="h-4 w-4" />
          <span className="text-xs font-medium">{title}</span>
        </div>
        <p className={`text-2xl font-bold ${variantClasses[variant]}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export function ScheduleAnalyticsDialog({ schedule }: ScheduleAnalyticsDialogProps) {
  const [days, setDays] = useState<number>(30);
  const { data: stats, isLoading: statsLoading } = useScheduleStats(schedule.id);
  const { data: trends = [], isLoading: trendsLoading } = useScheduleTrends(schedule.id, days);

  const chartConfig = {
    successful: {
      label: 'Successful',
      color: 'hsl(var(--chart-2))',
    },
    failed: {
      label: 'Failed',
      color: 'hsl(var(--chart-5))',
    },
  };

  const getSuccessRateVariant = (rate: number) => {
    if (rate >= 90) return 'success';
    if (rate >= 70) return 'warning';
    return 'destructive';
  };

  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button size="icon" variant="ghost">
              <BarChart3 className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>View Analytics</TooltipContent>
      </Tooltip>
      
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics: {schedule.schedule_name}
          </DialogTitle>
        </DialogHeader>

        {statsLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
            <Skeleton className="h-48" />
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard 
                title="Total Uploads" 
                value={stats.totalUploads} 
                icon={Activity}
              />
              <StatCard 
                title="Success Rate" 
                value={`${stats.successRate.toFixed(1)}%`} 
                icon={stats.successRate >= 90 ? TrendingUp : TrendingDown}
                variant={getSuccessRateVariant(stats.successRate)}
              />
              <StatCard 
                title="Failed" 
                value={stats.failedUploads} 
                icon={XCircle}
                variant={stats.failedUploads > 0 ? 'destructive' : 'default'}
              />
              <StatCard 
                title="Avg Duration" 
                value={formatDuration(stats.avgUploadDuration)} 
                icon={Clock}
              />
            </div>

            {/* Additional Info */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-medium">Successful</span>
                  </div>
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {stats.successfulUploads}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium">In Queue</span>
                  </div>
                  <p className="text-lg font-semibold">{stats.queuedUploads}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Activity className="h-4 w-4" />
                    <span className="text-xs font-medium">Last Upload</span>
                  </div>
                  <p className="text-sm font-medium">
                    {stats.lastUploadAt 
                      ? format(new Date(stats.lastUploadAt), 'MMM d, h:mm a')
                      : 'Never'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Trends Chart */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Upload Trends</h4>
                  <Select 
                    value={days.toString()} 
                    onValueChange={(v) => setDays(Number(v))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="14">Last 14 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {trendsLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : trends.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-48 w-full">
                    <AreaChart data={trends}>
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => format(new Date(value), 'MMM d')}
                        tick={{ fontSize: 11 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        labelFormatter={(value) => format(new Date(value), 'MMMM d, yyyy')}
                      />
                      <Area
                        type="monotone"
                        dataKey="successful"
                        stackId="1"
                        stroke="var(--color-successful)"
                        fill="var(--color-successful)"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="failed"
                        stackId="1"
                        stroke="var(--color-failed)"
                        fill="var(--color-failed)"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    No upload data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No analytics data available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
