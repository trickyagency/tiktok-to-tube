import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

// Hook to check if a TikTok username already exists
export function useCheckTikTokUsername(username: string) {
  const [debouncedUsername, setDebouncedUsername] = useState('');

  useEffect(() => {
    const cleanUsername = username.replace(/^@/, '').toLowerCase().trim();
    const timer = setTimeout(() => {
      setDebouncedUsername(cleanUsername);
    }, 400);
    return () => clearTimeout(timer);
  }, [username]);

  return useQuery({
    queryKey: ['check-tiktok-username', debouncedUsername],
    queryFn: async () => {
      if (!debouncedUsername || debouncedUsername.length < 2) return null;
      
      const { data, error } = await supabase
        .from('tiktok_accounts')
        .select('id, username, avatar_url, follower_count')
        .eq('username', debouncedUsername)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: debouncedUsername.length >= 2,
    staleTime: 30000,
  });
}
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
  last_profile_synced_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  scrape_progress_current?: number;
  scrape_progress_total?: number;
  account_status: 'active' | 'private' | 'deleted' | 'not_found';
  youtube_description: string | null;
  youtube_tags: string | null;
}

export interface TikTokAccountWithOwner extends TikTokAccount {
  owner_email?: string;
}

export function useTikTokAccounts() {
  const { user, isOwner } = useAuth();
  
  return useQuery({
    queryKey: ['tiktok-accounts', user?.id, isOwner],
    queryFn: async () => {
      // Fetch accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('tiktok_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (accountsError) throw accountsError;
      if (!accounts || accounts.length === 0) return [] as TikTokAccountWithOwner[];

      // If owner, fetch all profiles to get owner emails
      if (isOwner) {
        const userIds = [...new Set(accounts.map(a => a.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.email]) || []);
        return accounts.map(account => ({
          ...account,
          owner_email: profileMap.get(account.user_id),
        })) as TikTokAccountWithOwner[];
      }

      return accounts as TikTokAccountWithOwner[];
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
