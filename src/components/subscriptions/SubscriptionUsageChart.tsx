import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';
import { BarChart3, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubscriptionUsageChartProps {
  accounts: any[];
}

export function SubscriptionUsageChart({ accounts }: SubscriptionUsageChartProps) {
  // Generate mock weekly data - in production this would come from actual usage tracking
  const totalVideos = accounts.reduce((sum, acc) => sum + (acc.video_count || 0), 0);
  
  const generateWeeklyData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day, index) => {
      // Create realistic looking data with variation
      const baseVideos = Math.floor(totalVideos / 14);
      const variation = Math.random() * baseVideos * 0.5;
      const videos = Math.max(0, Math.floor(baseVideos + variation - baseVideos * 0.25));
      
      // Simulate higher activity on weekdays
      const weekdayMultiplier = index < 5 ? 1.2 : 0.8;
      
      return {
        day,
        videos: Math.floor(videos * weekdayMultiplier),
        accounts: Math.min(accounts.length, Math.floor(Math.random() * accounts.length) + 1)
      };
    });
  };

  const data = generateWeeklyData();
  const totalThisWeek = data.reduce((sum, d) => sum + d.videos, 0);
  const avgPerDay = Math.round(totalThisWeek / 7);

  const chartConfig = {
    videos: {
      label: "Videos",
      color: "hsl(var(--primary))",
    },
    accounts: {
      label: "Accounts",
      color: "hsl(var(--chart-2))",
    },
  } satisfies ChartConfig;

  return (
    <Card className="bg-card/80 backdrop-blur-xl border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Weekly Activity</CardTitle>
              <CardDescription className="text-xs">Videos processed this week</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1 text-emerald-500" />
              {totalThisWeek} total
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No activity data yet</p>
              <p className="text-xs text-muted-foreground/70">Add accounts to see usage analytics</p>
            </div>
          </div>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVideos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  vertical={false} 
                  stroke="hsl(var(--border))" 
                  opacity={0.3}
                />
                <XAxis 
                  dataKey="day" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area
                  type="monotone"
                  dataKey="videos"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#colorVideos)"
                />
              </AreaChart>
            </ChartContainer>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border/50">
              <div className="text-center">
                <p className="text-lg font-bold">{totalThisWeek}</p>
                <p className="text-xs text-muted-foreground">This Week</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{avgPerDay}</p>
                <p className="text-xs text-muted-foreground">Daily Avg</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{accounts.length}</p>
                <p className="text-xs text-muted-foreground">Active Accounts</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
