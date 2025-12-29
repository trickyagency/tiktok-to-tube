import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type SubscriptionStatus = 'active' | 'pending' | 'expired' | 'cancelled' | 'none';

interface UserAccountLimits {
  maxTikTokAccounts: number;
  maxYouTubeChannels: number;
  currentTikTokAccounts: number;
  currentYouTubeChannels: number;
  canAddTikTokAccount: boolean;
  canAddYouTubeChannel: boolean;
  remainingTikTokSlots: number;
  remainingYouTubeSlots: number;
  isUnlimited: boolean;
  subscriptionStatus: SubscriptionStatus;
  subscriptionMessage: string;
}

export function useUserAccountLimits() {
  const { user, isOwner } = useAuth();

  return useQuery({
    queryKey: ['user-account-limits', user?.id, isOwner],
    queryFn: async (): Promise<UserAccountLimits> => {
      if (!user) {
        return {
          maxTikTokAccounts: 0,
          maxYouTubeChannels: 0,
          currentTikTokAccounts: 0,
          currentYouTubeChannels: 0,
          canAddTikTokAccount: false,
          canAddYouTubeChannel: false,
          remainingTikTokSlots: 0,
          remainingYouTubeSlots: 0,
          isUnlimited: false,
          subscriptionStatus: 'none',
          subscriptionMessage: 'Please sign in to continue.',
        };
      }

      // Count current TikTok accounts
      const { count: tikTokCount } = await supabase
        .from('tiktok_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Count current YouTube channels
      const { count: youTubeCount } = await supabase
        .from('youtube_channels')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const currentTikTokAccounts = tikTokCount ?? 0;
      const currentYouTubeChannels = youTubeCount ?? 0;

      // Owner has unlimited access
      if (isOwner) {
        return {
          maxTikTokAccounts: 999999,
          maxYouTubeChannels: 999999,
          currentTikTokAccounts,
          currentYouTubeChannels,
          canAddTikTokAccount: true,
          canAddYouTubeChannel: true,
          remainingTikTokSlots: 999999,
          remainingYouTubeSlots: 999999,
          isUnlimited: true,
          subscriptionStatus: 'active',
          subscriptionMessage: 'Owner access - unlimited accounts',
        };
      }

      // Fetch user subscription for regular users
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('account_count, status')
        .eq('user_id', user.id)
        .maybeSingle();

      // Determine subscription status and limits
      if (!subscription) {
        return {
          maxTikTokAccounts: 0,
          maxYouTubeChannels: 0,
          currentTikTokAccounts,
          currentYouTubeChannels,
          canAddTikTokAccount: false,
          canAddYouTubeChannel: false,
          remainingTikTokSlots: 0,
          remainingYouTubeSlots: 0,
          isUnlimited: false,
          subscriptionStatus: 'none',
          subscriptionMessage: 'No subscription assigned. Contact administrator.',
        };
      }

      const status = subscription.status as SubscriptionStatus;
      const accountCount = subscription.account_count ?? 0;

      // Handle different subscription statuses
      switch (status) {
        case 'pending':
          return {
            maxTikTokAccounts: 0,
            maxYouTubeChannels: 0,
            currentTikTokAccounts,
            currentYouTubeChannels,
            canAddTikTokAccount: false,
            canAddYouTubeChannel: false,
            remainingTikTokSlots: 0,
            remainingYouTubeSlots: 0,
            isUnlimited: false,
            subscriptionStatus: 'pending',
            subscriptionMessage: 'Subscription pending activation.',
          };

        case 'expired':
          return {
            maxTikTokAccounts: accountCount,
            maxYouTubeChannels: accountCount,
            currentTikTokAccounts,
            currentYouTubeChannels,
            canAddTikTokAccount: false,
            canAddYouTubeChannel: false,
            remainingTikTokSlots: 0,
            remainingYouTubeSlots: 0,
            isUnlimited: false,
            subscriptionStatus: 'expired',
            subscriptionMessage: 'Subscription expired. Contact administrator to renew.',
          };

        case 'cancelled':
          return {
            maxTikTokAccounts: accountCount,
            maxYouTubeChannels: accountCount,
            currentTikTokAccounts,
            currentYouTubeChannels,
            canAddTikTokAccount: false,
            canAddYouTubeChannel: false,
            remainingTikTokSlots: 0,
            remainingYouTubeSlots: 0,
            isUnlimited: false,
            subscriptionStatus: 'cancelled',
            subscriptionMessage: 'Subscription cancelled. Contact administrator.',
          };

        case 'active':
        default:
          const remainingSlots = Math.max(0, accountCount - currentTikTokAccounts);
          return {
            maxTikTokAccounts: accountCount,
            maxYouTubeChannels: accountCount,
            currentTikTokAccounts,
            currentYouTubeChannels,
            canAddTikTokAccount: currentTikTokAccounts < accountCount,
            canAddYouTubeChannel: currentYouTubeChannels < accountCount,
            remainingTikTokSlots: remainingSlots,
            remainingYouTubeSlots: Math.max(0, accountCount - currentYouTubeChannels),
            isUnlimited: false,
            subscriptionStatus: 'active',
            subscriptionMessage: remainingSlots > 0 
              ? `${remainingSlots} of ${accountCount} account slots remaining`
              : `Account limit reached (${accountCount})`,
          };
      }
    },
    enabled: !!user,
  });
}
