import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LowInventoryAccount {
  tiktokAccountId: string;
  username: string;
  unpublishedCount: number;
  avatarUrl: string | null;
}

const LOW_THRESHOLD = 5;

export function useLowVideoInventory() {
  const { user, isOwner } = useAuth();

  return useQuery({
    queryKey: ['low-video-inventory', user?.id, isOwner],
    queryFn: async () => {
      // Get all active tiktok accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('tiktok_accounts')
        .select('id, username, avatar_url, account_status')
        .eq('is_active', true)
        .neq('account_status', 'deleted');

      if (accountsError) throw accountsError;
      if (!accounts || accounts.length === 0) return [];

      // Get unpublished video counts per account
      const { data: videos, error: videosError } = await supabase
        .from('scraped_videos')
        .select('tiktok_account_id')
        .eq('is_published', false);

      if (videosError) throw videosError;

      // Count unpublished per account
      const countMap = new Map<string, number>();
      for (const v of videos || []) {
        countMap.set(v.tiktok_account_id, (countMap.get(v.tiktok_account_id) || 0) + 1);
      }

      // Filter accounts with fewer than threshold unpublished videos
      const lowInventory: LowInventoryAccount[] = accounts
        .map(account => ({
          tiktokAccountId: account.id,
          username: account.username,
          unpublishedCount: countMap.get(account.id) || 0,
          avatarUrl: account.avatar_url,
        }))
        .filter(a => a.unpublishedCount < LOW_THRESHOLD)
        .sort((a, b) => a.unpublishedCount - b.unpublishedCount);

      return lowInventory;
    },
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}
