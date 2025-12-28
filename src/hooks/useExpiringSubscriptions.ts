import { useMemo } from 'react';
import { useUserSubscriptions, AccountSubscription } from './useSubscriptions';
import { differenceInDays } from 'date-fns';

export interface ExpiringSubscription extends AccountSubscription {
  daysRemaining: number;
}

export function useExpiringSubscriptions(warningDays: number = 7) {
  const { data: subscriptions = [], isLoading } = useUserSubscriptions();

  const expiringSubscriptions = useMemo(() => {
    const now = new Date();
    
    return subscriptions
      .filter((sub): sub is AccountSubscription & { expires_at: string } => {
        if (sub.status !== 'active' || !sub.expires_at) return false;
        
        const expiresAt = new Date(sub.expires_at);
        const daysRemaining = differenceInDays(expiresAt, now);
        
        return daysRemaining >= 0 && daysRemaining <= warningDays;
      })
      .map((sub) => {
        const daysRemaining = differenceInDays(new Date(sub.expires_at), now);
        return {
          ...sub,
          daysRemaining,
        } as ExpiringSubscription;
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [subscriptions, warningDays]);

  return {
    expiringSubscriptions,
    hasExpiringSubscriptions: expiringSubscriptions.length > 0,
    isLoading,
  };
}
