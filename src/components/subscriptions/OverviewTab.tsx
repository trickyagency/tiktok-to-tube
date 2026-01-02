import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RadialProgress } from './RadialProgress';
import { AccountsGridSkeleton } from './MySubscriptionsSkeleton';
import { 
  Crown, 
  Users, 
  Video, 
  CheckCircle2,
  MessageCircle,
  ExternalLink,
  Sparkles,
  Clock,
  Plus,
  ArrowUpRight,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface OverviewTabProps {
  subscription: any;
  limits: any;
  accounts: any[];
  accountsLoading: boolean;
  isOwner: boolean;
  planId: string;
  planName: string;
  gradient: string;
  features: string[];
  PlanIcon: any;
  daysRemaining: number | null;
  expiresAt: Date | null;
  isExpiringSoon: boolean;
  usedAccounts: number;
  maxAccounts: number;
  isUnlimited: boolean;
  onContactSupport: () => void;
}

function AccountCard({ account, index }: { account: any; index: number }) {
  return (
    <Card 
      className="group relative overflow-hidden bg-card/80 backdrop-blur-xl border-border/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <CardContent className="relative p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-12 w-12 ring-2 ring-border group-hover:ring-primary/50 transition-all">
              <AvatarImage src={account.avatar_url} alt={account.username} />
              <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-500 text-white">
                {account.username?.[0]?.toUpperCase() || 'T'}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
              <Activity className="h-2 w-2 text-white" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{account.display_name || account.username}</p>
            <p className="text-xs text-muted-foreground truncate">@{account.username}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant="secondary" className="text-[10px] h-5 px-2">
                <Video className="h-2.5 w-2.5 mr-1" />
                {account.video_count || 0}
              </Badge>
              {account.youtube_channel && (
                <Badge variant="outline" className="text-[10px] h-5 px-2 border-red-500/30 text-red-500">
                  <ExternalLink className="h-2.5 w-2.5 mr-1" />
                  YT
                </Badge>
              )}
            </div>
          </div>
          
          <Button 
            asChild 
            size="icon" 
            variant="ghost" 
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Link to={`/dashboard/tiktok-accounts`}>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyAccountsState() {
  return (
    <div className="relative flex flex-col items-center justify-center py-16 col-span-full">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 rounded-2xl" />
      
      <div className="absolute top-8 left-8 w-16 h-16 rounded-full bg-pink-500/10 blur-2xl animate-pulse" />
      <div className="absolute bottom-8 right-8 w-20 h-20 rounded-full bg-purple-500/10 blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl" />
        <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
          <Users className="h-10 w-10 text-primary" />
        </div>
      </div>
      
      <h3 className="text-xl font-semibold mb-2">No TikTok Accounts Yet</h3>
      <p className="text-muted-foreground text-center max-w-sm mb-6">
        Add your first TikTok account to start repurposing videos to YouTube
      </p>
      
      <Button asChild className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-0">
        <Link to="/dashboard/tiktok-accounts">
          <Plus className="h-4 w-4 mr-2" />
          Add TikTok Account
        </Link>
      </Button>
    </div>
  );
}

export function OverviewTab({
  subscription,
  limits,
  accounts,
  accountsLoading,
  isOwner,
  planId,
  planName,
  gradient,
  features,
  PlanIcon,
  daysRemaining,
  expiresAt,
  isExpiringSoon,
  usedAccounts,
  maxAccounts,
  isUnlimited,
  onContactSupport
}: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Plan Card */}
        <Card className="relative overflow-hidden bg-card/80 backdrop-blur-xl border-border/50">
          <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", gradient)} />
          
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "h-16 w-16 rounded-2xl flex items-center justify-center",
                  "bg-gradient-to-br",
                  gradient.replace('from-', 'from-').replace('to-', 'to-') + '/20'
                )}>
                  <PlanIcon className={cn(
                    "h-8 w-8",
                    planId === 'owner' ? 'text-amber-500' : 
                    planId === 'pro' ? 'text-purple-500' : 
                    planId === 'scale' ? 'text-orange-500' : 'text-blue-500'
                  )} />
                </div>
                <div>
                  <CardTitle className="text-xl">{planName} Plan</CardTitle>
                  <CardDescription>
                    {isOwner ? 'Full platform access' : 'Your current subscription'}
                  </CardDescription>
                </div>
              </div>
              <Badge 
                variant="secondary" 
                className={cn(
                  "bg-gradient-to-r text-white border-0",
                  gradient
                )}
              >
                Active
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-3">
              {features.map((feature, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className={cn(
                    "h-5 w-5 rounded-full flex items-center justify-center",
                    "bg-gradient-to-br from-emerald-500/20 to-green-500/20"
                  )}>
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  </div>
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>

            {isExpiringSoon && expiresAt && !isOwner && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Clock className="h-5 w-5 text-amber-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    Expires in {daysRemaining} days
                  </p>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                    {format(expiresAt, 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>
            )}

            {!isOwner && (
              <div className="flex gap-3 pt-2">
                <Button 
                  asChild
                  className={cn(
                    "flex-1 bg-gradient-to-r text-white border-0",
                    gradient
                  )}
                >
                  <Link to="/dashboard/upgrade">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Upgrade Plan
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onContactSupport}
                  className="flex-1"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Support
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Card */}
        <Card className="relative overflow-hidden bg-card/80 backdrop-blur-xl border-border/50">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
          
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Account Usage</CardTitle>
                <CardDescription>TikTok accounts connected</CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              {isUnlimited ? (
                <div className="h-32 w-32 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center">
                  <div className="text-center">
                    <Crown className="h-8 w-8 text-amber-500 mx-auto mb-1" />
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Unlimited</span>
                  </div>
                </div>
              ) : (
                <RadialProgress
                  value={usedAccounts}
                  max={maxAccounts}
                  size={140}
                  strokeWidth={10}
                />
              )}
            </div>

            {!isUnlimited && maxAccounts <= 30 && (
              <div className="flex gap-1.5 justify-center flex-wrap">
                {Array.from({ length: maxAccounts }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-3 w-3 rounded-full transition-all duration-300",
                      i < usedAccounts 
                        ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" 
                        : "bg-muted/50"
                    )}
                    style={{ animationDelay: `${i * 30}ms` }}
                  />
                ))}
              </div>
            )}

            {limits?.canAddTikTokAccount && (
              <Button asChild className="w-full" variant="outline">
                <Link to="/dashboard/tiktok-accounts">
                  <Plus className="h-4 w-4 mr-2" />
                  Add TikTok Account
                </Link>
              </Button>
            )}

            {!limits?.canAddTikTokAccount && !isUnlimited && (
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Account limit reached. Upgrade to add more.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Connected Accounts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Connected TikTok Accounts</h2>
            <p className="text-sm text-muted-foreground">
              {accounts.length} account{accounts.length !== 1 ? 's' : ''} connected to your subscription
            </p>
          </div>
          {accounts.length > 0 && (
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard/tiktok-accounts">
                View All
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          )}
        </div>

        {accountsLoading ? (
          <AccountsGridSkeleton />
        ) : accounts.length === 0 ? (
          <Card className="bg-card/80 backdrop-blur-xl border-border/50">
            <EmptyAccountsState />
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.slice(0, 6).map((account, index) => (
              <AccountCard key={account.id} account={account} index={index} />
            ))}
            {accounts.length > 6 && (
              <Card className="flex items-center justify-center bg-card/50 backdrop-blur-xl border-border/50 border-dashed min-h-[100px]">
                <Button asChild variant="ghost">
                  <Link to="/dashboard/tiktok-accounts" className="text-muted-foreground">
                    +{accounts.length - 6} more accounts
                  </Link>
                </Button>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
