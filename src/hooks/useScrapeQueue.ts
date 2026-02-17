import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export interface ScrapeQueueItem {
  id: string;
  tiktok_account_id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  attempts: number;
  max_attempts: number;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  videos_found: number;
  videos_imported: number;
  created_at: string;
  updated_at: string;
}

export interface ScrapeQueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

// Hook to fetch queue items with realtime updates
export function useScrapeQueue() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['scrape-queue', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('scrape_queue')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as ScrapeQueueItem[];
    },
    enabled: !!user,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('scrape-queue-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scrape_queue',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['scrape-queue'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
}

// Hook to get queue statistics
export function useScrapeQueueStats() {
  const { data: queue } = useScrapeQueue();

  const stats: ScrapeQueueStats = {
    total: queue?.length || 0,
    pending: queue?.filter(q => q.status === 'pending').length || 0,
    processing: queue?.filter(q => q.status === 'processing').length || 0,
    completed: queue?.filter(q => q.status === 'completed').length || 0,
    failed: queue?.filter(q => q.status === 'failed').length || 0,
  };

  return stats;
}

// Hook to queue all accounts for scraping
export function useQueueAllAccounts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountIds: string[]) => {
      if (!user) throw new Error('Not authenticated');

      // Create queue items with staggered scheduling (10 seconds apart)
      const now = Date.now();
      const queueItems = accountIds.map((accountId, index) => ({
        tiktok_account_id: accountId,
        user_id: user.id,
        status: 'pending',
        priority: 0,
        scheduled_at: new Date(now + (index * 10000)).toISOString(), // 10 seconds apart
      }));

      const { data, error } = await supabase
        .from('scrape_queue')
        .insert(queueItems)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scrape-queue'] });
      toast({
        title: 'Accounts queued for scraping',
        description: `${data.length} accounts have been added to the scrape queue.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to queue accounts',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Hook to queue a single account
export function useQueueAccount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('scrape_queue')
        .insert({
          tiktok_account_id: accountId,
          user_id: user.id,
          status: 'pending',
          priority: 1, // Higher priority for single account
          scheduled_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scrape-queue'] });
      toast({
        title: 'Account queued',
        description: 'Account has been added to the scrape queue.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to queue account',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Hook to retry failed items
export function useRetryFailedItems() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      // Reset failed items to pending with new scheduled time
      const { data, error } = await supabase
        .from('scrape_queue')
        .update({
          status: 'pending',
          attempts: 0,
          error_message: null,
          scheduled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('status', 'failed')
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scrape-queue'] });
      toast({
        title: 'Failed items retried',
        description: `${data.length} items have been re-queued.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to retry items',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Hook to clear completed items
export function useClearCompletedItems() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('scrape_queue')
        .delete()
        .eq('user_id', user.id)
        .eq('status', 'completed');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scrape-queue'] });
      toast({
        title: 'Queue cleared',
        description: 'Completed items have been removed.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to clear queue',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Hook to cancel pending items
export function useCancelPendingItems() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('scrape_queue')
        .delete()
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scrape-queue'] });
      queryClient.invalidateQueries({ queryKey: ['tiktok-accounts'] });
      toast({
        title: 'Queue cancelled',
        description: 'Pending items have been removed.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to cancel queue',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Hook to force clear stuck processing items (older than 30 minutes)
export function useClearStuckItems() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from('scrape_queue')
        .delete()
        .eq('user_id', user.id)
        .eq('status', 'processing')
        .lt('started_at', thirtyMinutesAgo);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scrape-queue'] });
      queryClient.invalidateQueries({ queryKey: ['tiktok-accounts'] });
      toast({
        title: 'Stuck items cleared',
        description: 'Stale processing items have been removed.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to clear stuck items',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
