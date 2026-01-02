import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SubscriptionUsageChart } from './SubscriptionUsageChart';
import { 
  BarChart3, 
  Users, 
  Video, 
  TrendingUp,
  Activity,
  Clock,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UsageTabProps {
  accounts: any[];
  usedAccounts: number;
  maxAccounts: number;
  isUnlimited: boolean;
}

function UsageStatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  color = 'primary'
}: { 
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof Activity;
  trend?: { value: number; isPositive: boolean };
  color?: 'primary' | 'blue' | 'emerald' | 'amber' | 'purple';
}) {
  const colorClasses = {
    primary: 'from-primary to-primary/70',
    blue: 'from-blue-500 to-cyan-500',
    emerald: 'from-emerald-500 to-green-500',
    amber: 'from-amber-500 to-orange-500',
    purple: 'from-purple-500 to-pink-500'
  };

  return (
    <Card className="relative overflow-hidden bg-card/80 backdrop-blur-xl border-border/50">
      <div className={cn("absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r", colorClasses[color])} />
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{title}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold">{value}</span>
              {trend && (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    trend.isPositive ? "text-emerald-500" : "text-red-500"
                  )}
                >
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center",
            "bg-gradient-to-br opacity-20",
            colorClasses[color]
          )}>
            <Icon className="h-5 w-5 text-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function UsageTab({ accounts, usedAccounts, maxAccounts, isUnlimited }: UsageTabProps) {
  // Calculate mock usage data - in production this would come from actual usage tracking
  const totalVideos = accounts.reduce((sum, acc) => sum + (acc.video_count || 0), 0);
  const activeAccounts = accounts.filter(acc => acc.video_count > 0).length;
  const usagePercentage = isUnlimited ? 0 : (usedAccounts / maxAccounts) * 100;

  return (
    <div className="space-y-6">
      {/* Usage Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UsageStatCard
          title="Active Accounts"
          value={activeAccounts}
          subtitle={`of ${accounts.length} total`}
          icon={Users}
          color="blue"
        />
        <UsageStatCard
          title="Total Videos"
          value={totalVideos}
          subtitle="Scraped content"
          icon={Video}
          trend={{ value: 12, isPositive: true }}
          color="emerald"
        />
        <UsageStatCard
          title="This Week"
          value={Math.floor(totalVideos * 0.15)}
          subtitle="Videos processed"
          icon={Activity}
          trend={{ value: 8, isPositive: true }}
          color="purple"
        />
        <UsageStatCard
          title="Avg per Account"
          value={accounts.length > 0 ? Math.round(totalVideos / accounts.length) : 0}
          subtitle="Videos"
          icon={BarChart3}
          color="amber"
        />
      </div>

      {/* Usage Chart */}
      <SubscriptionUsageChart accounts={accounts} />

      {/* Detailed Usage Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Account Capacity */}
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-base">Account Capacity</CardTitle>
                <CardDescription className="text-xs">Your account usage this period</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Used</span>
                <span className="font-medium">
                  {isUnlimited ? '∞' : `${usedAccounts} of ${maxAccounts}`}
                </span>
              </div>
              {!isUnlimited && (
                <Progress value={usagePercentage} className="h-2" />
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold text-blue-500">{usedAccounts}</div>
                <div className="text-xs text-muted-foreground">Connected</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold text-emerald-500">
                  {isUnlimited ? '∞' : maxAccounts - usedAccounts}
                </div>
                <div className="text-xs text-muted-foreground">Available</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Summary */}
        <Card className="bg-card/80 backdrop-blur-xl border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <CardTitle className="text-base">Activity Summary</CardTitle>
                <CardDescription className="text-xs">Your activity this billing period</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Videos Scraped', value: totalVideos, icon: Video, color: 'text-emerald-500' },
                { label: 'Accounts Added', value: accounts.length, icon: Users, color: 'text-blue-500' },
                { label: 'Active This Week', value: activeAccounts, icon: Activity, color: 'text-purple-500' },
                { label: 'Peak Hour', value: '2PM-4PM', icon: Clock, color: 'text-amber-500' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <item.icon className={cn("h-4 w-4", item.color)} />
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                  </div>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Tips */}
      <Card className="bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 border-border/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold mb-1">Optimize Your Usage</h4>
              <p className="text-sm text-muted-foreground">
                {accounts.length === 0 
                  ? "Add your first TikTok account to start tracking usage analytics and maximize your subscription value."
                  : `You're using ${Math.round(usagePercentage)}% of your account capacity. ${usagePercentage < 50 ? 'Consider adding more accounts to maximize your plan value.' : usagePercentage >= 90 ? 'Consider upgrading for more capacity.' : 'Great job utilizing your subscription!'}`
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
