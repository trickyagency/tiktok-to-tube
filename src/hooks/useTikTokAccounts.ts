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

export function useAddTikTokAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (username: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('apify-scraper', {
        body: { username },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to scrape account');
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
        toast.success(`Added @${data.account.username} with ${data.account.new_videos} new videos`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRefreshTikTokAccount() {
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
        throw new Error(response.error.message || 'Failed to refresh account');
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
        toast.info(`Syncing @${data.account?.username || 'account'}...`, {
          description: 'Videos will appear as they are imported',
        });
      } else {
        toast.success(`Synced @${data.account.username} - ${data.account.new_videos} new videos`);
      }
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
