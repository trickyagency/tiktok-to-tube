import { useState, useEffect } from 'react';
import { subDays, format } from 'date-fns';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUploadLogStats, useUploadLogTrends, UploadLogFilter } from '@/hooks/useUploadLogs';
import { useYouTubeChannels } from '@/hooks/useYouTubeChannels';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Upload, 
  CheckCircle, 
  Clock, 
  HardDrive, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  Activity,
  Youtube,
  Zap,
  Target,
  FileVideo,
  AlertCircle
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Cell
} from 'recharts';

// Animated Counter Component
function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplayValue(0);
      return;
    }

    const steps = 20;
    const stepValue = value / steps;
    const stepDuration = duration / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <>{displayValue}</>;
}

// Radial Progress Component
function RadialProgress({ 
  value, 
  size = 120, 
  strokeWidth = 10,
  label 
}: { 
  value: number; 
  size?: number; 
  strokeWidth?: number;
  label?: string;
}) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedValue / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  const getColor = () => {
    if (animatedValue >= 80) return 'text-success';
    if (animatedValue >= 50) return 'text-amber-500';
    return 'text-destructive';
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`transition-all duration-1000 ease-out ${getColor()}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${getColor()}`}>{Math.round(animatedValue)}%</span>
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Enhanced Stat Card with animations
interface EnhancedStatCardProps {
  title: string;
  value: number;
  displayValue?: string;
  description: string;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
  gradientClass: string;
  iconColorClass?: string;
}

function EnhancedStatCard({ 
  title, 
  value, 
  displayValue,
  description, 
  icon, 
  trend, 
  gradientClass,
  iconColorClass = 'text-primary'
}: EnhancedStatCardProps) {
  return (
    <Card className={`${gradientClass} border-0 card-hover transition-all duration-300`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">
                {displayValue || <AnimatedCounter value={value} />}
              </span>
              {trend && (
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${trend.positive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}
                >
                  {trend.positive ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                  {trend.value}%
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className={`p-3 rounded-xl bg-background/80 border border-border/50`}>
            <div className={iconColorClass}>{icon}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading Skeleton for Stats
function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="border-0 bg-muted/30">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-3 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-11 w-11 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Loading Skeleton for Charts
function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-end justify-around gap-2 pt-8">
          {[...Array(7)].map((_, i) => (
            <Skeleton 
              key={i} 
              className="w-full" 
              style={{ height: `${Math.random() * 60 + 40}%` }} 
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Empty State Component
function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[300px] text-center p-6">
      <div className="p-4 rounded-full bg-muted/50 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-[200px]">{description}</p>
    </div>
  );
}

// Custom Tooltip Component
function CustomTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload) return null;
  
  return (
    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-foreground mb-2">{formatDate(label)}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{formatter ? formatter(entry.value) : entry.value}</span>
        </div>
      ))}
    </div>
  );
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
];

const UploadAnalytics = () => {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedChannelId, setSelectedChannelId] = useState<string | undefined>(undefined);

  const { channels, isLoading: isLoadingChannels } = useYouTubeChannels();

  const filter: UploadLogFilter = {
    from: dateRange.from,
    to: dateRange.to,
    channelId: selectedChannelId,
  };

  const { data: stats, isLoading: isLoadingStats } = useUploadLogStats(filter);
  const { data: trends, isLoading: isLoadingTrends } = useUploadLogTrends(filter);

  const isLoading = isLoadingStats || isLoadingTrends;

  const selectedChannel = channels?.find(c => c.id === selectedChannelId);

  const phaseData = stats ? [
    { name: 'Download', value: stats.avgDownloadMs },
    { name: 'Token Refresh', value: stats.avgTokenRefreshMs },
    { name: 'Upload', value: stats.avgUploadMs },
    { name: 'Finalize', value: stats.avgFinalizeMs },
  ] : [];

  const totalPhaseTime = phaseData.reduce((acc, p) => acc + p.value, 0);

  // Calculate date range display
  const dateRangeLabel = dateRange.from && dateRange.to
    ? `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`
    : 'All time';

  return (
    <DashboardLayout
      title={selectedChannel ? `Upload Analytics - ${selectedChannel.channel_title}` : "Upload Analytics"}
      description={selectedChannel ? "Performance metrics for this channel" : "Performance metrics and trends for your video uploads"}
    >
      <div className="space-y-6">
        {/* Enhanced Header with Context */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <DateRangePicker
              from={dateRange.from}
              to={dateRange.to}
              onDateChange={(range) => setDateRange({ from: range.from, to: range.to })}
            />
            
            <Select
              value={selectedChannelId || 'all'}
              onValueChange={(value) => setSelectedChannelId(value === 'all' ? undefined : value)}
            >
              <SelectTrigger className="w-[220px]">
                <Youtube className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                {channels?.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    {channel.channel_title || 'Unnamed Channel'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Context Badges */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Activity className="h-3 w-3 mr-1" />
              {dateRangeLabel}
            </Badge>
            {channels && channels.length > 0 && (
              <Badge variant="outline" className="text-xs">
                <Youtube className="h-3 w-3 mr-1" />
                {selectedChannelId ? '1 channel' : `${channels.length} channels`}
              </Badge>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <StatsSkeleton />
            <div className="grid gap-6 lg:grid-cols-2">
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
          </div>
        ) : (
          <>
            {/* Enhanced Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <EnhancedStatCard
                title="Total Uploads"
                value={stats?.total || 0}
                description="Videos processed"
                icon={<Upload className="h-5 w-5" />}
                gradientClass="stat-gradient-1"
                iconColorClass="text-primary"
              />
              <EnhancedStatCard
                title="Success Rate"
                value={stats?.successRate || 0}
                displayValue={`${stats?.successRate || 0}%`}
                description={`${stats?.success || 0} successful uploads`}
                icon={<Target className="h-5 w-5" />}
                trend={stats?.successRate ? { value: stats.successRate, positive: stats.successRate >= 80 } : undefined}
                gradientClass="stat-gradient-3"
                iconColorClass="text-success"
              />
              <EnhancedStatCard
                title="Avg Upload Time"
                value={Math.round((stats?.avgDurationMs || 0) / 1000)}
                displayValue={formatDuration(stats?.avgDurationMs || 0)}
                description="Per video processing"
                icon={<Zap className="h-5 w-5" />}
                gradientClass="stat-gradient-2"
                iconColorClass="text-amber-500"
              />
              <EnhancedStatCard
                title="Total Data"
                value={Math.round((stats?.totalSizeBytes || 0) / (1024 * 1024 * 1024))}
                displayValue={formatBytes(stats?.totalSizeBytes || 0)}
                description={`Avg ${formatBytes(stats?.avgSizeBytes || 0)}/video`}
                icon={<HardDrive className="h-5 w-5" />}
                gradientClass="stat-gradient-4"
                iconColorClass="text-blue-500"
              />
            </div>

            {/* Success Rate Gauge + Quick Stats */}
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Success Rate</CardTitle>
                  <CardDescription>Overall upload reliability</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-6">
                  <RadialProgress 
                    value={stats?.successRate || 0} 
                    size={140}
                    strokeWidth={12}
                    label="Success"
                  />
                  <div className="flex items-center gap-4 mt-6 text-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-success" />
                      <span className="text-muted-foreground">{stats?.success || 0} Passed</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-destructive" />
                      <span className="text-muted-foreground">{stats?.failed || 0} Failed</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Phase Breakdown
                  </CardTitle>
                  <CardDescription>Time distribution across upload phases</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 py-4">
                  {phaseData.map((phase, index) => {
                    const percentage = totalPhaseTime > 0 ? (phase.value / totalPhaseTime) * 100 : 0;
                    return (
                      <div key={phase.name} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{phase.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{formatDuration(phase.value)}</span>
                            <Badge variant="secondary" className="text-xs">
                              {percentage.toFixed(0)}%
                            </Badge>
                          </div>
                        </div>
                        <Progress 
                          value={percentage} 
                          className="h-2"
                          style={{
                            '--progress-color': CHART_COLORS[index]
                          } as React.CSSProperties}
                        />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Upload Trends Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Upload Trends
                  </CardTitle>
                  <CardDescription>Success vs failed uploads over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {trends && trends.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={trends}>
                        <defs>
                          <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="failedGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDate}
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend 
                          wrapperStyle={{ paddingTop: '20px' }}
                          iconType="circle"
                          iconSize={8}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="success" 
                          stackId="1"
                          stroke="hsl(var(--success))" 
                          strokeWidth={2}
                          fill="url(#successGradient)" 
                          name="Successful"
                          animationDuration={1000}
                          animationEasing="ease-out"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="failed" 
                          stackId="1"
                          stroke="hsl(var(--destructive))" 
                          strokeWidth={2}
                          fill="url(#failedGradient)" 
                          name="Failed"
                          animationDuration={1000}
                          animationEasing="ease-out"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState 
                      icon={Activity}
                      title="No upload data yet"
                      description="Upload trends will appear here once you start uploading videos"
                    />
                  )}
                </CardContent>
              </Card>

              {/* Phase Performance Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Phase Performance
                  </CardTitle>
                  <CardDescription>Average time spent in each upload phase</CardDescription>
                </CardHeader>
                <CardContent>
                  {phaseData.some(p => p.value > 0) ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={phaseData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis 
                          type="number"
                          tickFormatter={(v) => formatDuration(v)}
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          width={100}
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                          formatter={(value: number) => [formatDuration(value), 'Duration']}
                          cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
                        />
                        <Bar 
                          dataKey="value" 
                          radius={[0, 6, 6, 0]}
                          animationDuration={1000}
                          animationEasing="ease-out"
                        >
                          {phaseData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState 
                      icon={BarChart3}
                      title="No phase data"
                      description="Phase performance metrics will appear after uploads complete"
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Performance Summary
                </CardTitle>
                <CardDescription>Detailed breakdown of upload performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-success/10">
                        <CheckCircle className="h-4 w-4 text-success" />
                      </div>
                      <span className="text-sm text-muted-foreground">Successful</span>
                    </div>
                    <p className="text-3xl font-bold text-success">
                      <AnimatedCounter value={stats?.success || 0} />
                    </p>
                    <Progress value={stats?.total ? ((stats?.success || 0) / stats.total) * 100 : 0} className="h-1.5 bg-success/20" />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-destructive/10">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      </div>
                      <span className="text-sm text-muted-foreground">Failed</span>
                    </div>
                    <p className="text-3xl font-bold text-destructive">
                      <AnimatedCounter value={stats?.failed || 0} />
                    </p>
                    <Progress value={stats?.total ? ((stats?.failed || 0) / stats.total) * 100 : 0} className="h-1.5 bg-destructive/20" />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm text-muted-foreground">In Progress</span>
                    </div>
                    <p className="text-3xl font-bold text-primary">
                      <AnimatedCounter value={stats?.inProgress || 0} />
                    </p>
                    <Progress value={stats?.total ? ((stats?.inProgress || 0) / stats.total) * 100 : 0} className="h-1.5 bg-primary/20" />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <FileVideo className="h-4 w-4 text-blue-500" />
                      </div>
                      <span className="text-sm text-muted-foreground">Avg Video Size</span>
                    </div>
                    <p className="text-3xl font-bold">{formatBytes(stats?.avgSizeBytes || 0)}</p>
                    <div className="text-xs text-muted-foreground">
                      Total: {formatBytes(stats?.totalSizeBytes || 0)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default UploadAnalytics;
