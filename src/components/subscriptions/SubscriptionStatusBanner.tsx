import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useUserAccountLimits } from '@/hooks/useUserAccountLimits';
import { useCurrentUserSubscription } from '@/hooks/useUserSubscription';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Ban, 
  AlertTriangle,
  Crown,
  Loader2
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export function SubscriptionStatusBanner() {
  const { data: limits, isLoading: limitsLoading } = useUserAccountLimits();
  const { data: subscription, isLoading: subLoading } = useCurrentUserSubscription();

  const isLoading = limitsLoading || subLoading;

  if (isLoading) {
    return (
      <Alert className="border-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertDescription>Loading subscription status...</AlertDescription>
      </Alert>
    );
  }

  // Owner has unlimited access
  if (limits?.isUnlimited) {
    return (
      <Alert className="border-amber-500/50 bg-amber-500/10">
        <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          <strong>Owner Access</strong> — Unlimited accounts and full platform access
        </AlertDescription>
      </Alert>
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
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>No subscription assigned.</strong> Contact administrator to get access.
        </AlertDescription>
      </Alert>
    );
  }

  // Pending subscription
  if (status === 'pending') {
    return (
      <Alert className="border-yellow-500/50 bg-yellow-500/10">
        <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
        <AlertDescription className="text-yellow-700 dark:text-yellow-300">
          <strong>Subscription pending activation.</strong> Contact administrator to activate your subscription.
        </AlertDescription>
      </Alert>
    );
  }

  // Expired subscription
  if (status === 'expired') {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Subscription expired</strong>
          {expiresAt && <span> on {format(expiresAt, 'MMM d, yyyy')}</span>}. 
          Contact administrator to renew.
        </AlertDescription>
      </Alert>
    );
  }

  // Cancelled subscription
  if (status === 'cancelled') {
    return (
      <Alert variant="destructive">
        <Ban className="h-4 w-4" />
        <AlertDescription>
          <strong>Subscription cancelled.</strong> Contact administrator for assistance.
        </AlertDescription>
      </Alert>
    );
  }

  // Active subscription
  const usagePercent = maxCount > 0 ? (currentCount / maxCount) * 100 : 0;
  const remaining = maxCount - currentCount;
  const isAtLimit = remaining <= 0;

  // Show warning if expiring soon (within 14 days)
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 14 && daysUntilExpiry > 0;

  if (isAtLimit) {
    return (
      <Alert className="border-orange-500/50 bg-orange-500/10">
        <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <div className="text-orange-700 dark:text-orange-300">
            <strong>{planName}</strong> — Account limit reached ({currentCount}/{maxCount})
            {isExpiringSoon && expiresAt && (
              <span className="ml-2 text-sm">
                • Expires in {daysUntilExpiry} days
              </span>
            )}
          </div>
          <Progress value={100} className="w-24 h-2" />
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-green-500/50 bg-green-500/10">
      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <div className="text-green-700 dark:text-green-300">
          <strong>{planName}</strong> — {currentCount} of {maxCount} accounts used • {remaining} slot{remaining !== 1 ? 's' : ''} remaining
          {isExpiringSoon && expiresAt && (
            <span className="ml-2 text-sm text-yellow-600 dark:text-yellow-400">
              • Expires {format(expiresAt, 'MMM d, yyyy')}
            </span>
          )}
        </div>
        <Progress value={usagePercent} className="w-24 h-2" />
      </AlertDescription>
    </Alert>
  );
}
