import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type TikTokAccountRow = Database['public']['Tables']['tiktok_accounts']['Row'];
type ScrapedVideoRow = Database['public']['Tables']['scraped_videos']['Row'];

export function useTikTokAccountsRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const previousCountRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;

    // Subscribe to tiktok_accounts changes
    const accountsChannel = supabase
      .channel('tiktok-accounts-realtime')
      .on<TikTokAccountRow>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tiktok_accounts',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<TikTokAccountRow>) => {
          const newAccount = payload.new as TikTokAccountRow;
          const oldAccount = payload.old as TikTokAccountRow;
          
          // Direct cache update for instant UI feedback during scraping
          queryClient.setQueryData<TikTokAccountRow[]>(['tiktok-accounts'], (old) => {
            if (!old) return old;
            return old.map(acc => 
              acc.id === newAccount.id ? { ...acc, ...newAccount } : acc
            );
          });
          
          // Check if scraping just completed
          if (oldAccount?.scrape_status === 'scraping' && newAccount?.scrape_status === 'completed') {
            const previousCount = previousCountRef.current[newAccount.id] || 0;
            const newVideos = (newAccount.video_count || 0) - previousCount;
            toast.success(`Synced @${newAccount.username}`, {
              description: `${newVideos > 0 ? newVideos : 0} new videos imported`,
            });
            // Full refresh on completion
            queryClient.invalidateQueries({ queryKey: ['tiktok-accounts'] });
            queryClient.invalidateQueries({ queryKey: ['scraped-videos'] });
            queryClient.invalidateQueries({ queryKey: ['scraped-videos-count'] });
          }
          
          // Check if scraping failed
          if (oldAccount?.scrape_status === 'scraping' && newAccount?.scrape_status === 'failed') {
            toast.error(`Failed to sync @${newAccount.username}`);
            queryClient.invalidateQueries({ queryKey: ['tiktok-accounts'] });
          }
        }
      )
      .on<TikTokAccountRow>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tiktok_accounts',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tiktok-accounts'] });
        }
      )
      .subscribe();

    // Subscribe to scraped_videos inserts for live count updates
    const videosChannel = supabase
      .channel('scraped-videos-realtime')
      .on<ScrapedVideoRow>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'scraped_videos',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Invalidate to update video counts
          queryClient.invalidateQueries({ queryKey: ['scraped-videos'] });
          queryClient.invalidateQueries({ queryKey: ['scraped-videos-count'] });
        }
      )
      .subscribe();

    // Store initial video counts for comparison
    const fetchInitialCounts = async () => {
      const { data: accounts } = await supabase
        .from('tiktok_accounts')
        .select('id, video_count')
        .eq('user_id', user.id);
      
      if (accounts) {
        accounts.forEach((acc) => {
          previousCountRef.current[acc.id] = acc.video_count || 0;
        });
      }
    };
    fetchInitialCounts();

    return () => {
      supabase.removeChannel(accountsChannel);
      supabase.removeChannel(videosChannel);
    };
  }, [user, queryClient]);
}
