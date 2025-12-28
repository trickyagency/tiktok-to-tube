import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserAccountLimits {
  maxTikTokAccounts: number;
  maxYouTubeChannels: number;
  currentTikTokAccounts: number;
  currentYouTubeChannels: number;
  canAddTikTokAccount: boolean;
  canAddYouTubeChannel: boolean;
  remainingTikTokSlots: number;
  remainingYouTubeSlots: number;
}

export function useUserAccountLimits() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-account-limits', user?.id],
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
        };
      }

      // Fetch user limits
      const { data: limits } = await supabase
        .from('user_limits')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Use defaults if no limits record exists
      const maxTikTokAccounts = limits?.max_tiktok_accounts ?? 5;
      const maxYouTubeChannels = limits?.max_youtube_channels ?? 3;

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

      return {
        maxTikTokAccounts,
        maxYouTubeChannels,
        currentTikTokAccounts,
        currentYouTubeChannels,
        canAddTikTokAccount: currentTikTokAccounts < maxTikTokAccounts,
        canAddYouTubeChannel: currentYouTubeChannels < maxYouTubeChannels,
        remainingTikTokSlots: Math.max(0, maxTikTokAccounts - currentTikTokAccounts),
        remainingYouTubeSlots: Math.max(0, maxYouTubeChannels - currentYouTubeChannels),
      };
    },
    enabled: !!user,
  });
}
