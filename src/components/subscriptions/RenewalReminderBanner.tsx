import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, X } from 'lucide-react';
import { useExpiringSubscriptions, ExpiringSubscription } from '@/hooks/useExpiringSubscriptions';

const DISMISSAL_KEY = 'subscription-renewal-banner-dismissed';
const DISMISSAL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function RenewalReminderBanner() {
  const { expiringSubscriptions, hasExpiringSubscriptions, isLoading } = useExpiringSubscriptions();
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISSAL_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissedTime < DISMISSAL_DURATION_MS) {
        setIsDismissed(true);
      } else {
        localStorage.removeItem(DISMISSAL_KEY);
      }
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSAL_KEY, Date.now().toString());
    setIsDismissed(true);
  };

  if (isLoading || !hasExpiringSubscriptions || isDismissed) {
    return null;
  }

  const getDaysText = (days: number) => {
    if (days === 0) return 'today';
    if (days === 1) return 'tomorrow';
    return `in ${days} days`;
  };

  const isSingle = expiringSubscriptions.length === 1;
  const firstSub = expiringSubscriptions[0];

  return (
    <Alert className="mb-6 border-amber-500/50 bg-amber-500/10 relative">
      <Clock className="h-4 w-4 text-amber-500" />
      <AlertTitle className="text-amber-600 dark:text-amber-400 pr-8">
        {isSingle 
          ? 'Subscription Expiring Soon'
          : `${expiringSubscriptions.length} Subscriptions Expiring Soon`
        }
      </AlertTitle>
      <AlertDescription className="flex items-start justify-between flex-wrap gap-3">
        <div className="text-muted-foreground">
          {isSingle ? (
            <p>
              Your subscription for <span className="font-medium text-foreground">@{firstSub.tiktok_account?.username}</span> expires {getDaysText(firstSub.daysRemaining)}.
              Renew now to avoid service interruption.
            </p>
          ) : (
            <ul className="space-y-1 mt-1">
              {expiringSubscriptions.slice(0, 3).map((sub) => (
                <li key={sub.id} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="font-medium text-foreground">@{sub.tiktok_account?.username}</span>
                  <span className="text-muted-foreground">- expires {getDaysText(sub.daysRemaining)}</span>
                </li>
              ))}
              {expiringSubscriptions.length > 3 && (
                <li className="text-sm text-muted-foreground ml-3">
                  +{expiringSubscriptions.length - 3} more
                </li>
              )}
            </ul>
          )}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          asChild 
          className="shrink-0 border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
        >
          <Link to="/dashboard/my-subscriptions">
            View Subscriptions
          </Link>
        </Button>
      </AlertDescription>
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </Alert>
  );
}
