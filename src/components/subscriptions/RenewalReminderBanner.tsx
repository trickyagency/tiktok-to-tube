import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, X, Package, MessageCircle } from 'lucide-react';
import { useExpiringSubscriptions, ExpiringSubscription } from '@/hooks/useExpiringSubscriptions';
import { differenceInHours, differenceInDays, format } from 'date-fns';
import { generateWhatsAppLink } from '@/lib/whatsapp';
import { useAuth } from '@/contexts/AuthContext';

const DISMISSAL_KEY = 'subscription-renewal-banner-dismissed';
const DISMISSAL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface RenewalReminderBannerProps {
  variant?: 'compact' | 'detailed';
  showDismiss?: boolean;
  onRenewClick?: (accountId: string) => void;
}

export function RenewalReminderBanner({ 
  variant = 'compact', 
  showDismiss = true,
  onRenewClick 
}: RenewalReminderBannerProps) {
  const { expiringSubscriptions, hasExpiringSubscriptions, isLoading } = useExpiringSubscriptions();
  const [isDismissed, setIsDismissed] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!showDismiss) return;
    
    const dismissedAt = localStorage.getItem(DISMISSAL_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissedTime < DISMISSAL_DURATION_MS) {
        setIsDismissed(true);
      } else {
        localStorage.removeItem(DISMISSAL_KEY);
      }
    }
  }, [showDismiss]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSAL_KEY, Date.now().toString());
    setIsDismissed(true);
  };

  if (isLoading || !hasExpiringSubscriptions || (showDismiss && isDismissed)) {
    return null;
  }

  const getDaysText = (days: number) => {
    if (days === 0) return 'today';
    if (days === 1) return 'tomorrow';
    return `in ${days} days`;
  };

  const getPreciseCountdown = (expiresAt: string) => {
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const hoursRemaining = differenceInHours(expiryDate, now);
    const daysRemaining = differenceInDays(expiryDate, now);

    if (hoursRemaining < 24) {
      return `${hoursRemaining} hours remaining`;
    } else if (daysRemaining < 3) {
      const remainingHours = hoursRemaining % 24;
      return `${daysRemaining} days, ${remainingHours} hours remaining`;
    }
    return `${daysRemaining} days remaining`;
  };

  const handleRenewViaWhatsApp = (sub: ExpiringSubscription) => {
    const whatsappLink = generateWhatsAppLink({
      type: 'renew',
      username: sub.tiktok_account?.username || 'unknown',
      planName: sub.plan?.name || 'Plan',
      planPrice: (sub.plan?.price_monthly || 0) / 100,
      userEmail: user?.email,
      expiryDate: sub.expires_at ? format(new Date(sub.expires_at), 'MMMM d, yyyy') : undefined,
    });
    window.open(whatsappLink, '_blank');
  };

  const isSingle = expiringSubscriptions.length === 1;
  const firstSub = expiringSubscriptions[0];

  // Compact variant (for Dashboard)
  if (variant === 'compact') {
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
        {showDismiss && (
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </Alert>
    );
  }

  // Detailed variant (for My Subscriptions page)
  return (
    <Alert className="mb-6 border-amber-500/50 bg-amber-500/10 relative">
      <Clock className="h-4 w-4 text-amber-500" />
      <AlertTitle className="text-amber-600 dark:text-amber-400 pr-8">
        {isSingle 
          ? 'Subscription Expiring Soon'
          : `${expiringSubscriptions.length} Subscriptions Expiring Soon`
        }
      </AlertTitle>
      <AlertDescription>
        <div className="mt-3 space-y-3">
          {expiringSubscriptions.map((sub) => (
            <div 
              key={sub.id} 
              className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-amber-500/20"
            >
              <Package className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">{sub.plan?.name || 'Plan'}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="font-medium text-foreground">@{sub.tiktok_account?.username}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                  <p>
                    Expires: <span className="font-medium text-foreground">{format(new Date(sub.expires_at!), 'MMMM d, yyyy')}</span>
                  </p>
                  <p className="text-amber-600 dark:text-amber-400 font-medium">
                    {getPreciseCountdown(sub.expires_at!)}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-green-500/50 text-green-600 hover:bg-green-500/10"
                  onClick={() => handleRenewViaWhatsApp(sub)}
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  WhatsApp
                </Button>
                {onRenewClick && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                    onClick={() => onRenewClick(sub.tiktok_account_id)}
                  >
                    Renew Now
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </AlertDescription>
      {showDismiss && (
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </Alert>
  );
}
