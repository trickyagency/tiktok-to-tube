import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { 
  Users, 
  UserCheck, 
  Activity, 
  Mail,
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  CheckCircle2,
  Video,
  Youtube,
  Upload,
  ExternalLink,
  UserPlus,
  Download,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

// Animated counter component
const AnimatedCounter = ({ value, duration = 1000 }: { value: number; duration?: number }) => {
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

  return <span>{displayValue.toLocaleString()}</span>;
};

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  description?: string;
  trend?: { value: number; isPositive: boolean };
  gradientClass: string;
  isWarning?: boolean;
  href?: string;
  isPulsing?: boolean;
}

const StatCard = ({ 
  title, 
  value, 
  icon, 
  description, 
  trend,
  gradientClass,
  isWarning = false,
  href,
  isPulsing = false,
}: StatCardProps) => {
  const content = (
    <Card className={`card-hover border-0 ${gradientClass} ${href ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold tracking-tight ${isWarning && value > 0 ? 'text-amber-500' : ''}`}>
                <AnimatedCounter value={value} />
              </span>
              {trend && (
                <span className={`text-xs font-medium flex items-center gap-0.5 ${trend.isPositive ? 'text-emerald-500' : 'text-destructive'}`}>
                  {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
              )}
            </div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          <div className={`p-3 rounded-xl bg-background/80 border ${isWarning && value > 0 ? 'border-amber-500/50' : 'border-border/50'} relative`}>
            {icon}
            {isPulsing && value > 0 && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link to={href} className="block">{content}</Link>;
  }
  return content;
};

// Radial Progress Component
const RadialProgress = ({ value, size = 120, strokeWidth = 10 }: { value: number; size?: number; strokeWidth?: number }) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedValue / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  const getColor = () => {
    if (value >= 80) return 'hsl(142, 76%, 36%)';
    if (value >= 50) return 'hsl(45, 93%, 47%)';
    return 'hsl(0, 84%, 60%)';
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
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
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold">{animatedValue}%</span>
        <span className="text-xs text-muted-foreground">Verified</span>
      </div>
    </div>
  );
};

export default function Analytics() {
  const { isOwner, loading: authLoading } = useAuth();
  const { data, isLoading } = useAnalytics();

  if (!authLoading && !isOwner) {
    return <Navigate to="/dashboard" replace />;
  }

  const pieData = data ? [
    { name: 'Accepted', value: data.inviteStats.accepted, color: 'hsl(142, 76%, 36%)' },
    { name: 'Pending', value: data.inviteStats.pending, color: 'hsl(45, 93%, 47%)' },
    { name: 'Expired', value: data.inviteStats.expired, color: 'hsl(0, 84%, 60%)' },
    { name: 'Cancelled', value: data.inviteStats.cancelled, color: 'hsl(var(--muted-foreground))' },
  ].filter(item => item.value > 0) : [];

  const totalInvitations = pieData.reduce((sum, item) => sum + item.value, 0);
  const acceptanceRate = totalInvitations > 0 
    ? Math.round((data?.inviteStats.accepted || 0) / totalInvitations * 100) 
    : 0;

  const chartConfig = {
    users: {
      label: 'Users',
      color: 'hsl(var(--primary))',
    },
  };

  // Calculate total growth from user growth data
  const totalGrowth = data?.userGrowth && data.userGrowth.length >= 2
    ? data.userGrowth[data.userGrowth.length - 1].count - data.userGrowth[0].count
    : 0;

  return (
    <DashboardLayout title="Platform Analytics" description="Comprehensive platform metrics and insights (Owner only)">
      <div className="space-y-6">
        {/* Stats Cards Grid - 6 Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i} className="stat-gradient-1">
                  <CardContent className="p-6">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <StatCard
                title="Total Users"
                value={data?.totalUsers || 0}
                icon={<Users className="h-5 w-5 text-primary" />}
                description="All registered accounts"
                trend={data?.weeklyUserGrowth ? { value: data.weeklyUserGrowth, isPositive: data.weeklyUserGrowth >= 0 } : undefined}
                gradientClass="stat-gradient-1"
                href="/dashboard/users"
              />
              <StatCard
                title="Verified Users"
                value={data?.verifiedUsers || 0}
                icon={<UserCheck className="h-5 w-5 text-emerald-500" />}
                description={`${data?.verificationRate || 0}% verification rate`}
                gradientClass="stat-gradient-3"
              />
              <StatCard
                title="Active (30d)"
                value={data?.activeUsers || 0}
                icon={<Activity className="h-5 w-5 text-blue-500" />}
                description="Signed in within 30 days"
                gradientClass="stat-gradient-2"
                isPulsing
              />
              <StatCard
                title="Pending Invites"
                value={data?.pendingInvitations || 0}
                icon={<Mail className="h-5 w-5 text-amber-500" />}
                description="Awaiting response"
                gradientClass="stat-gradient-4"
                isWarning
                isPulsing={data?.pendingInvitations ? data.pendingInvitations > 0 : false}
                href="/dashboard/users"
              />
              <StatCard
                title="TikTok Accounts"
                value={data?.platformStats?.tiktokAccounts || 0}
                icon={<Video className="h-5 w-5 text-pink-500" />}
                description="Connected accounts"
                gradientClass="bg-gradient-to-br from-pink-500/10 via-background to-background"
                href="/dashboard/tiktok"
              />
              <StatCard
                title="YouTube Channels"
                value={data?.platformStats?.youtubeChannels || 0}
                icon={<Youtube className="h-5 w-5 text-red-500" />}
                description="Connected channels"
                gradientClass="bg-gradient-to-br from-red-500/10 via-background to-background"
                href="/dashboard/youtube"
              />
            </>
          )}
        </div>

        {/* Video Stats Row */}
        <div className="grid gap-4 md:grid-cols-3">
          {isLoading ? (
            <>
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <Card className="border-border/50 bg-gradient-to-br from-violet-500/5 via-background to-background">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Scraped Videos</p>
                      <p className="text-2xl font-bold mt-1">
                        <AnimatedCounter value={data?.platformStats?.scrapedVideos || 0} />
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                      <Sparkles className="h-5 w-5 text-violet-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50 bg-gradient-to-br from-emerald-500/5 via-background to-background">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Published Videos</p>
                      <p className="text-2xl font-bold mt-1">
                        <AnimatedCounter value={data?.platformStats?.publishedVideos || 0} />
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {data?.platformStats?.publishedThisWeek || 0} this week
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <Upload className="h-5 w-5 text-emerald-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50 bg-gradient-to-br from-blue-500/5 via-background to-background">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Published This Month</p>
                      <p className="text-2xl font-bold mt-1">
                        <AnimatedCounter value={data?.platformStats?.publishedThisMonth || 0} />
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* User Growth Chart */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    User Growth
                  </CardTitle>
                  <CardDescription>
                    Cumulative signups over the last 30 days
                  </CardDescription>
                </div>
                {totalGrowth > 0 && (
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    +{totalGrowth} new
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <AreaChart data={data?.userGrowth || []}>
                    <defs>
                      <linearGradient id="colorUsersGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                        <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                      interval="preserveStartEnd"
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorUsersGradient)"
                      name="Users"
                      animationDuration={1500}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Invite Stats Pie Chart */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5 text-primary" />
                    Invitation Status
                  </CardTitle>
                  <CardDescription>
                    Breakdown of all invitation statuses
                  </CardDescription>
                </div>
                {acceptanceRate > 0 && (
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    {acceptanceRate}% accepted
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : totalInvitations === 0 ? (
                <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground">
                  <Mail className="h-12 w-12 mb-3 opacity-50" />
                  <p className="font-medium">No invitations sent yet</p>
                  <p className="text-sm">Start inviting users to see stats</p>
                </div>
              ) : (
                <div className="h-[250px] flex items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Legend 
                        verticalAlign="middle" 
                        align="right"
                        layout="vertical"
                        iconType="circle"
                        iconSize={8}
                        formatter={(value, entry: any) => (
                          <span className="text-sm text-foreground">
                            {value} <span className="text-muted-foreground">({entry.payload.value})</span>
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Label */}
                  <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none hidden md:flex flex-col items-center" style={{ marginLeft: '-60px' }}>
                    <span className="text-2xl font-bold">{totalInvitations}</span>
                    <span className="text-xs text-muted-foreground">Total</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Verification Rate & Recent Activity */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Verification Rate */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Email Verification Rate
              </CardTitle>
              <CardDescription>
                Percentage of users who have verified their email
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-4">
                      <RadialProgress value={data?.verificationRate || 0} />
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="text-sm">Verified: {data?.verifiedUsers || 0}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                          <span className="text-sm">Unverified: {(data?.totalUsers || 0) - (data?.verifiedUsers || 0)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-primary" />
                          <span className="text-sm">Total: {data?.totalUsers || 0}</span>
                        </div>
                      </div>
                    </div>
                    <Progress value={data?.verificationRate || 0} className="h-2" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Sign-ins */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>
                    Latest user sign-ins
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/dashboard/users" className="text-xs">
                    View All <ArrowUpRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : data?.recentSignIns && data.recentSignIns.length > 0 ? (
                <div className="space-y-3">
                  {data.recentSignIns.map((user, index) => {
                    const initial = user.email.charAt(0).toUpperCase();
                    const timeSince = formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true });
                    const isRecent = new Date(user.last_sign_in_at) > new Date(Date.now() - 60 * 60 * 1000);
                    
                    return (
                      <div 
                        key={index} 
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors -mx-2"
                      >
                        <Avatar className="h-9 w-9 border border-border/50">
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-sm font-medium">
                            {initial}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.email}</p>
                          <p className="text-xs text-muted-foreground">{timeSince}</p>
                        </div>
                        {isRecent && (
                          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 text-xs border-emerald-500/20">
                            Active
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Footer */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                <span>Quick Actions</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/dashboard/users">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite User
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/dashboard/users">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Users
                  </Link>
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" disabled>
                      <Download className="h-4 w-4 mr-2" />
                      Export Report
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Coming soon</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}