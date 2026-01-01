import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, RefreshCw, Trash2, Play, AlertCircle, CheckCircle2, Clock, Loader2, Lock, XCircle, Activity } from 'lucide-react';
import { TikTokAccountWithOwner } from '@/hooks/useTikTokAccounts';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';

interface AccountHealthSummaryProps {
  accounts: TikTokAccountWithOwner[];
  onScrape: (accountId: string) => void;
  onSyncProfile: (accountId: string) => void;
  onDelete: (accountId: string) => void;
  isApifyConfigured: boolean;
  isScraping: string | null;
  isSyncing: string | null;
}

type HealthStatus = 'healthy' | 'pending' | 'scraping' | 'private' | 'failed' | 'deleted';

interface HealthStats {
  healthy: number;
  pending: number;
  scraping: number;
  private: number;
  failed: number;
  deleted: number;
}

interface ProblematicAccount {
  account: TikTokAccountWithOwner;
  status: HealthStatus;
  severity: number; // 1 = critical, 2 = warning, 3 = info
}

const HEALTH_COLORS: Record<HealthStatus, string> = {
  healthy: 'hsl(142, 71%, 45%)', // emerald
  pending: 'hsl(217, 91%, 60%)', // blue
  scraping: 'hsl(263, 70%, 50%)', // violet
  private: 'hsl(38, 92%, 50%)', // amber
  failed: 'hsl(25, 95%, 53%)', // orange
  deleted: 'hsl(0, 84%, 60%)', // red
};

const HEALTH_LABELS: Record<HealthStatus, string> = {
  healthy: 'Healthy',
  pending: 'Pending',
  scraping: 'Scraping',
  private: 'Private',
  failed: 'Failed',
  deleted: 'Deleted',
};

const HEALTH_ICONS: Record<HealthStatus, typeof CheckCircle2> = {
  healthy: CheckCircle2,
  pending: Clock,
  scraping: Loader2,
  private: Lock,
  failed: AlertCircle,
  deleted: XCircle,
};

export function AccountHealthSummary({
  accounts,
  onScrape,
  onSyncProfile,
  onDelete,
  isApifyConfigured,
  isScraping,
  isSyncing,
}: AccountHealthSummaryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAllProblematic, setShowAllProblematic] = useState(false);

  // Calculate health stats
  const healthStats = useMemo<HealthStats>(() => {
    const stats: HealthStats = {
      healthy: 0,
      pending: 0,
      scraping: 0,
      private: 0,
      failed: 0,
      deleted: 0,
    };

    accounts.forEach(account => {
      if (account.account_status === 'deleted' || account.account_status === 'not_found') {
        stats.deleted++;
      } else if (account.account_status === 'private') {
        stats.private++;
      } else if (account.scrape_status === 'failed') {
        stats.failed++;
      } else if (account.scrape_status === 'scraping') {
        stats.scraping++;
      } else if (account.scrape_status === 'pending' || !account.last_scraped_at) {
        stats.pending++;
      } else {
        stats.healthy++;
      }
    });

    return stats;
  }, [accounts]);

  // Get problematic accounts sorted by severity
  const problematicAccounts = useMemo<ProblematicAccount[]>(() => {
    const problematic: ProblematicAccount[] = [];

    accounts.forEach(account => {
      if (account.account_status === 'deleted' || account.account_status === 'not_found') {
        problematic.push({ account, status: 'deleted', severity: 1 });
      } else if (account.scrape_status === 'failed') {
        problematic.push({ account, status: 'failed', severity: 1 });
      } else if (account.account_status === 'private') {
        problematic.push({ account, status: 'private', severity: 2 });
      } else if (account.scrape_status === 'pending' || !account.last_scraped_at) {
        problematic.push({ account, status: 'pending', severity: 3 });
      }
    });

    return problematic.sort((a, b) => a.severity - b.severity);
  }, [accounts]);

  const healthPercentage = accounts.length > 0 
    ? Math.round((healthStats.healthy / accounts.length) * 100) 
    : 0;

  const needsAttentionCount = problematicAccounts.filter(p => p.severity <= 2).length;

  // Chart data
  const chartData = useMemo(() => {
    return Object.entries(healthStats)
      .filter(([, value]) => value > 0)
      .map(([key, value]) => ({
        name: HEALTH_LABELS[key as HealthStatus],
        value,
        color: HEALTH_COLORS[key as HealthStatus],
      }));
  }, [healthStats]);

  const displayedProblematic = showAllProblematic 
    ? problematicAccounts 
    : problematicAccounts.slice(0, 5);

  const getActionButton = (item: ProblematicAccount) => {
    const { account, status } = item;
    const isCurrentlyScraping = isScraping === account.id;
    const isCurrentlySyncing = isSyncing === account.id;

    switch (status) {
      case 'deleted':
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(account.id)}
            className="h-7 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Remove
          </Button>
        );
      case 'failed':
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onScrape(account.id)}
            disabled={!isApifyConfigured || isCurrentlyScraping}
            className="h-7"
          >
            {isCurrentlyScraping ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Retry
          </Button>
        );
      case 'private':
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSyncProfile(account.id)}
            disabled={isCurrentlySyncing}
            className="h-7"
          >
            {isCurrentlySyncing ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Sync
          </Button>
        );
      case 'pending':
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onScrape(account.id)}
            disabled={!isApifyConfigured || isCurrentlyScraping}
            className="h-7"
          >
            {isCurrentlyScraping ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Play className="h-3 w-3 mr-1" />
            )}
            Scrape
          </Button>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status: HealthStatus) => {
    const Icon = HEALTH_ICONS[status];
    const variants: Record<HealthStatus, 'destructive' | 'secondary' | 'outline'> = {
      healthy: 'secondary',
      pending: 'outline',
      scraping: 'secondary',
      private: 'outline',
      failed: 'destructive',
      deleted: 'destructive',
    };

    return (
      <Badge variant={variants[status]} className="text-xs gap-1">
        <Icon className={cn("h-3 w-3", status === 'scraping' && 'animate-spin')} />
        {HEALTH_LABELS[status]}
      </Badge>
    );
  };

  if (accounts.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm font-medium">Account Health</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {healthPercentage}% healthy
                    {needsAttentionCount > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 ml-2">
                        • {needsAttentionCount} need{needsAttentionCount === 1 ? 's' : ''} attention
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180"
              )} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Chart Section */}
              <div className="flex items-center gap-4">
                <div className="relative h-32 w-32 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [`${value} accounts`, '']}
                        contentStyle={{ 
                          background: 'hsl(var(--popover))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-lg font-bold">{healthPercentage}%</div>
                      <div className="text-[10px] text-muted-foreground">Healthy</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm">
                  {Object.entries(healthStats).map(([key, value]) => {
                    if (value === 0) return null;
                    const Icon = HEALTH_ICONS[key as HealthStatus];
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <div 
                          className="h-2.5 w-2.5 rounded-full" 
                          style={{ backgroundColor: HEALTH_COLORS[key as HealthStatus] }}
                        />
                        <Icon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{HEALTH_LABELS[key as HealthStatus]}:</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recommendations Section */}
              {problematicAccounts.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      Needs Attention ({problematicAccounts.length})
                    </h4>
                  </div>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {displayedProblematic.map(item => (
                      <div 
                        key={item.account.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage src={item.account.avatar_url || ''} />
                            <AvatarFallback className="text-xs">
                              {item.account.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium truncate">
                            @{item.account.username}
                          </span>
                          {getStatusBadge(item.status)}
                        </div>
                        {getActionButton(item)}
                      </div>
                    ))}
                  </div>

                  {problematicAccounts.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllProblematic(!showAllProblematic)}
                      className="w-full text-xs"
                    >
                      {showAllProblematic 
                        ? 'Show less' 
                        : `Show ${problematicAccounts.length - 5} more`}
                    </Button>
                  )}
                </div>
              )}

              {/* All healthy message */}
              {problematicAccounts.length === 0 && (
                <div className="flex items-center justify-center p-6 text-center">
                  <div>
                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      All accounts are healthy!
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      No issues detected with your monitored accounts.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
