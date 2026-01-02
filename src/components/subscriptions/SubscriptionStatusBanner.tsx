import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useUserAccountLimits } from '@/hooks/useUserAccountLimits';
import { useCurrentUserSubscription } from '@/hooks/useUserSubscription';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Ban, 
  AlertTriangle,
  Crown,
  Loader2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export function SubscriptionStatusBanner() {
  const { data: limits, isLoading: limitsLoading } = useUserAccountLimits();
  const { data: subscription, isLoading: subLoading } = useCurrentUserSubscription();

  const isLoading = limitsLoading || subLoading;

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card/80 backdrop-blur-xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <div className="h-4 w-32 bg-muted/50 rounded animate-pulse" />
            <div className="h-3 w-48 bg-muted/30 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Owner has unlimited access
  if (limits?.isUnlimited) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 p-4">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5" />
        <div className="relative flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <Crown className="h-6 w-6 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Owner Access
            </p>
            <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
              Unlimited accounts and full platform access
            </p>
          </div>
        </div>
      </div>
    );
  }

  const status = limits?.subscriptionStatus;
  const currentCount = limits?.currentTikTokAccounts || 0;
  const maxCount = limits?.maxTikTokAccounts || 0;
  const planName = subscription?.plan?.name || 'Subscription';
  const expiresAt = subscription?.expires_at ? new Date(subscription.expires_at) : null;
  const daysUntilExpiry = expiresAt ? differenceInDays(expiresAt, new Date()) : null;

  // No subscription
  if (status === 'none') {
    return (
      <div className="relative overflow-hidden rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/10 to-rose-500/10 p-4">
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-red-500/20 to-rose-500/20 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="font-semibold text-red-700 dark:text-red-300">No Subscription</p>
              <p className="text-sm text-red-600/80 dark:text-red-400/80">
                Contact administrator to get access
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pending subscription
  if (status === 'pending') {
    return (
      <div className="relative overflow-hidden rounded-xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 p-4">
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-500 animate-pulse" />
            </div>
            <div>
              <p className="font-semibold text-yellow-700 dark:text-yellow-300">Pending Activation</p>
              <p className="text-sm text-yellow-600/80 dark:text-yellow-400/80">
                Your subscription is awaiting activation
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Expired subscription
  if (status === 'expired') {
    return (
      <div className="relative overflow-hidden rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/10 to-rose-500/10 p-4">
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-red-500/20 to-rose-500/20 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="font-semibold text-red-700 dark:text-red-300">Subscription Expired</p>
              <p className="text-sm text-red-600/80 dark:text-red-400/80">
                {expiresAt ? `Expired on ${format(expiresAt, 'MMM d, yyyy')}` : 'Contact administrator to renew'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Cancelled subscription
  if (status === 'cancelled') {
    return (
      <div className="relative overflow-hidden rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/10 to-rose-500/10 p-4">
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-red-500/20 to-rose-500/20 flex items-center justify-center">
              <Ban className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="font-semibold text-red-700 dark:text-red-300">Subscription Cancelled</p>
              <p className="text-sm text-red-600/80 dark:text-red-400/80">
                Contact administrator for assistance
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active subscription
  const usagePercent = maxCount > 0 ? (currentCount / maxCount) * 100 : 0;
  const remaining = maxCount - currentCount;
  const isAtLimit = remaining <= 0;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 14 && daysUntilExpiry > 0;

  if (isAtLimit) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-amber-500/10 p-4">
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="font-semibold text-orange-700 dark:text-orange-300">
                {planName} — Account Limit Reached
              </p>
              <p className="text-sm text-orange-600/80 dark:text-orange-400/80">
                {currentCount}/{maxCount} accounts used
                {isExpiringSoon && ` • Expires in ${daysUntilExpiry} days`}
              </p>
            </div>
          </div>
          <Button 
            asChild 
            size="sm" 
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-0"
          >
            <Link to="/dashboard/tiktok-accounts">
              Upgrade
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-emerald-500/10 p-4">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-500/5" />
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <p className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              {planName}
              <span className="text-xs font-normal text-emerald-600/70 dark:text-emerald-400/70">Active</span>
            </p>
            <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80">
              {currentCount} of {maxCount} accounts • {remaining} slot{remaining !== 1 ? 's' : ''} remaining
              {isExpiringSoon && (
                <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                  • Expires {format(expiresAt!, 'MMM d')}
                </span>
              )}
            </p>
          </div>
        </div>
        {/* Usage bar */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="w-24 h-2 bg-emerald-500/20 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-500",
                usagePercent >= 90 ? "bg-red-500" :
                usagePercent >= 75 ? "bg-amber-500" : "bg-emerald-500"
              )}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {Math.round(usagePercent)}%
          </span>
        </div>
      </div>
    </div>
  );
}
