import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, X, Package, MessageCircle } from 'lucide-react';
import { useExpiringSubscriptions } from '@/hooks/useExpiringSubscriptions';
import { differenceInHours, differenceInDays, format } from 'date-fns';
import { generateRenewalWhatsAppLink } from '@/lib/whatsapp';
import { useAuth } from '@/contexts/AuthContext';

const DISMISSAL_KEY = 'subscription-renewal-banner-dismissed';
const DISMISSAL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface RenewalReminderBannerProps {
  variant?: 'compact' | 'detailed';
  showDismiss?: boolean;
  onRenewClick?: () => void;
}

export function RenewalReminderBanner({ 
  variant = 'compact', 
  showDismiss = true,
  onRenewClick 
}: RenewalReminderBannerProps) {
  const { expiringSubscription, hasExpiringSubscription, isLoading } = useExpiringSubscriptions();
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

  if (isLoading || !hasExpiringSubscription || (showDismiss && isDismissed) || !expiringSubscription) {
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

  const handleRenewViaWhatsApp = () => {
    const whatsappLink = generateRenewalWhatsAppLink({
      planName: expiringSubscription.plan?.name || 'Plan',
      accountCount: expiringSubscription.account_count || 1,
      expiryDate: expiringSubscription.expires_at 
        ? format(new Date(expiringSubscription.expires_at), 'MMMM d, yyyy') 
        : undefined,
      userEmail: user?.email,
    });
    window.open(whatsappLink, '_blank');
  };

  const planName = expiringSubscription.plan?.name || 'Plan';

  // Compact variant (for Dashboard)
  if (variant === 'compact') {
    return (
      <Alert className="mb-6 border-amber-500/50 bg-amber-500/10 relative">
        <Clock className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-amber-600 dark:text-amber-400 pr-8">
          Subscription Expiring Soon
        </AlertTitle>
        <AlertDescription className="flex items-start justify-between flex-wrap gap-3">
          <div className="text-muted-foreground">
            <p>
              Your <span className="font-medium text-foreground">{planName}</span> subscription expires {getDaysText(expiringSubscription.daysRemaining)}.
              Renew now to avoid service interruption.
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            asChild 
            className="shrink-0 border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
          >
            <Link to="/dashboard/my-subscriptions">
              View Subscription
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
        Subscription Expiring Soon
      </AlertTitle>
      <AlertDescription>
        <div className="mt-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-amber-500/20">
            <Package className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">{planName}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">
                  {expiringSubscription.account_count} account{expiringSubscription.account_count !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                <p>
                  Expires: <span className="font-medium text-foreground">
                    {format(new Date(expiringSubscription.expires_at!), 'MMMM d, yyyy')}
                  </span>
                </p>
                <p className="text-amber-600 dark:text-amber-400 font-medium">
                  {getPreciseCountdown(expiringSubscription.expires_at!)}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleRenewViaWhatsApp}
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Renew via WhatsApp
              </Button>
              {onRenewClick && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                  onClick={onRenewClick}
                >
                  Renew Now
                </Button>
              )}
            </div>
          </div>
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
