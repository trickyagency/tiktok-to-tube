import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUploadLogStats, useUploadLogTrends } from '@/hooks/useUploadLogs';
import { 
  Upload, 
  CheckCircle, 
  Clock, 
  HardDrive, 
  TrendingUp, 
  TrendingDown,
  Loader2,
  BarChart3,
  Activity
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
  Legend
} from 'recharts';

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

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
  gradientClass: string;
}

function StatCard({ title, value, description, icon, trend, gradientClass }: StatCardProps) {
  return (
    <Card className={`${gradientClass} border-0`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          {trend && (
            <span className={`flex items-center text-xs ${trend.positive ? 'text-success' : 'text-destructive'}`}>
              {trend.positive ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
              {trend.value}%
            </span>
          )}
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const UploadAnalytics = () => {
  const { data: stats, isLoading: isLoadingStats } = useUploadLogStats();
  const { data: trends, isLoading: isLoadingTrends } = useUploadLogTrends(30);

  const isLoading = isLoadingStats || isLoadingTrends;

  const phaseData = stats ? [
    { name: 'Download', value: stats.avgDownloadMs, fill: 'hsl(var(--chart-1))' },
    { name: 'Token Refresh', value: stats.avgTokenRefreshMs, fill: 'hsl(var(--chart-2))' },
    { name: 'Upload', value: stats.avgUploadMs, fill: 'hsl(var(--chart-3))' },
    { name: 'Finalize', value: stats.avgFinalizeMs, fill: 'hsl(var(--chart-4))' },
  ] : [];

  return (
    <DashboardLayout
      title="Upload Analytics"
      description="Performance metrics and trends for your video uploads"
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Uploads"
                value={stats?.total || 0}
                description="All time"
                icon={<Upload className="h-4 w-4 text-muted-foreground" />}
                gradientClass="stat-gradient-1"
              />
              <StatCard
                title="Success Rate"
                value={`${stats?.successRate || 0}%`}
                description={`${stats?.success || 0} successful`}
                icon={<CheckCircle className="h-4 w-4 text-success" />}
                trend={stats?.successRate ? { value: stats.successRate, positive: stats.successRate >= 80 } : undefined}
                gradientClass="stat-gradient-3"
              />
              <StatCard
                title="Avg Upload Time"
                value={formatDuration(stats?.avgDurationMs || 0)}
                description="Per video"
                icon={<Clock className="h-4 w-4 text-muted-foreground" />}
                gradientClass="stat-gradient-2"
              />
              <StatCard
                title="Total Data"
                value={formatBytes(stats?.totalSizeBytes || 0)}
                description={`Avg ${formatBytes(stats?.avgSizeBytes || 0)}/video`}
                icon={<HardDrive className="h-4 w-4 text-muted-foreground" />}
                gradientClass="stat-gradient-4"
              />
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Upload Trends Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Upload Trends
                  </CardTitle>
                  <CardDescription>Success vs failed uploads over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {trends && trends.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={trends}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDate}
                          className="text-xs fill-muted-foreground"
                        />
                        <YAxis className="text-xs fill-muted-foreground" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          labelFormatter={formatDate}
                        />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="success" 
                          stackId="1"
                          stroke="hsl(var(--success))" 
                          fill="hsl(var(--success) / 0.3)" 
                          name="Successful"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="failed" 
                          stackId="1"
                          stroke="hsl(var(--destructive))" 
                          fill="hsl(var(--destructive) / 0.3)" 
                          name="Failed"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Phase Performance Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Phase Performance
                  </CardTitle>
                  <CardDescription>Average time spent in each upload phase</CardDescription>
                </CardHeader>
                <CardContent>
                  {phaseData.some(p => p.value > 0) ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={phaseData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          type="number"
                          tickFormatter={(v) => formatDuration(v)}
                          className="text-xs fill-muted-foreground"
                        />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          width={100}
                          className="text-xs fill-muted-foreground"
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number) => [formatDuration(value), 'Duration']}
                        />
                        <Bar 
                          dataKey="value" 
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Summary Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
                <CardDescription>Detailed breakdown of upload performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Successful Uploads</p>
                    <p className="text-2xl font-semibold text-success">{stats?.success || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Failed Uploads</p>
                    <p className="text-2xl font-semibold text-destructive">{stats?.failed || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">In Progress</p>
                    <p className="text-2xl font-semibold text-primary">{stats?.inProgress || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Avg Video Size</p>
                    <p className="text-2xl font-semibold">{formatBytes(stats?.avgSizeBytes || 0)}</p>
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
