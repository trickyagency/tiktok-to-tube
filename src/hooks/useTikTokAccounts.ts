import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TikTokAccount {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  follower_count: number;
  following_count: number;
  video_count: number;
  scrape_status: string;
  last_scraped_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  scrape_progress_current?: number;
  scrape_progress_total?: number;
}

export function useTikTokAccounts() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['tiktok-accounts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tiktok_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TikTokAccount[];
    },
    enabled: !!user,
  });
}

// Add account using TikWM (profile data only, no video scraping)
export function useAddTikTokAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (username: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('tikwm-profile', {
        body: { username },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to fetch profile');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tiktok-accounts'] });
      toast.success(`Added @${data.account.username}`, {
        description: 'Click "Scrape Now" to import videos',
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Scrape videos using Apify
export function useScrapeVideos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, username }: { accountId: string; username: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Update status to scraping
      await supabase
        .from('tiktok_accounts')
        .update({ scrape_status: 'scraping' })
        .eq('id', accountId);

      const response = await supabase.functions.invoke('apify-scraper', {
        body: { username, accountId },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to start scraper');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tiktok-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['scraped-videos'] });
      if (data.background) {
        toast.info(`Scraping @${data.account?.username || 'account'}...`, {
          description: 'Videos will appear as they are imported',
        });
      } else {
        toast.success(`Scraped @${data.account.username} - ${data.account.new_videos} new videos`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Refresh profile data using TikWM (no video scraping)
export function useRefreshTikTokAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, username }: { accountId: string; username: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('tikwm-profile', {
        body: { username, accountId },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to refresh profile');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tiktok-accounts'] });
      toast.success(`Synced @${data.account.username}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteTikTokAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      // Delete associated videos first
      const { error: videosError } = await supabase
        .from('scraped_videos')
        .delete()
        .eq('tiktok_account_id', accountId);

      if (videosError) throw videosError;

      // Delete the account
      const { error } = await supabase
        .from('tiktok_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiktok-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['scraped-videos'] });
      toast.success('Account deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useResetTikTokAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from('tiktok_accounts')
        .update({
          scrape_status: 'pending',
          scrape_progress_current: 0,
          scrape_progress_total: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiktok-accounts'] });
      toast.success('Scrape reset - you can try again');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Bulk sync all TikTok account profiles
export function useBulkSyncProfiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accounts: TikTokAccount[]) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const results = await Promise.allSettled(
        accounts.map(async (account) => {
          const response = await supabase.functions.invoke('tikwm-profile', {
            body: { username: account.username, accountId: account.id },
          });

          if (response.error) {
            throw new Error(response.error.message || 'Failed to sync profile');
          }

          if (response.data?.error) {
            throw new Error(response.data.error);
          }

          return { account, data: response.data };
        })
      );

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return { succeeded, failed, total: accounts.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tiktok-accounts'] });
      if (data.failed === 0) {
        toast.success(`Synced ${data.succeeded} profiles`);
      } else {
        toast.warning(`Synced ${data.succeeded}/${data.total} profiles`, {
          description: `${data.failed} failed to sync`,
        });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
