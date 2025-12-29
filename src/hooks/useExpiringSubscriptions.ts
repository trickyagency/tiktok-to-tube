import { useMemo } from 'react';
import { useCurrentUserSubscription, UserSubscription } from './useUserSubscription';
import { differenceInDays } from 'date-fns';

export interface ExpiringSubscription extends UserSubscription {
  daysRemaining: number;
}

export function useExpiringSubscriptions(warningDays: number = 7) {
  const { data: subscription, isLoading } = useCurrentUserSubscription();

  const expiringSubscription = useMemo(() => {
    if (!subscription || subscription.status !== 'active' || !subscription.expires_at) {
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(subscription.expires_at);
    const daysRemaining = differenceInDays(expiresAt, now);

    if (daysRemaining >= 0 && daysRemaining <= warningDays) {
      return {
        ...subscription,
        daysRemaining,
      } as ExpiringSubscription;
    }

    return null;
  }, [subscription, warningDays]);

  return {
    expiringSubscription,
    hasExpiringSubscription: !!expiringSubscription,
    isLoading,
  };
}
