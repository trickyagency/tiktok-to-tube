import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { QueueItemWithDetails } from './usePublishQueue';

export interface UploadHistoryItemWithOwner extends QueueItemWithDetails {
  owner_email?: string;
}

export function useUploadHistory(selectedChannelId?: string, page = 1, pageSize = 12) {
  const { user, isOwner } = useAuth();
  const queryClient = useQueryClient();

  const historyQuery = useQuery({
    queryKey: ['upload-history', user?.id, selectedChannelId, isOwner, page, pageSize],
    queryFn: async () => {
      if (!user?.id) return { items: [], count: 0 };

      const baseSelect = `
        *,
        scraped_video:scraped_videos(id, title, thumbnail_url, video_url, download_url, tiktok_account_id),
        youtube_channel:youtube_channels(id, channel_id, channel_handle, channel_title, channel_thumbnail, tiktok_account_id)
      `;

      // Calculate range for pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // If owner, fetch all history; otherwise only user's history
      if (isOwner) {
        let query = supabase
          .from('publish_queue')
          .select(baseSelect, { count: 'exact' })
          .eq('status', 'published')
          .order('processed_at', { ascending: false });

        if (selectedChannelId && selectedChannelId !== 'all') {
          query = query.eq('youtube_channel_id', selectedChannelId);
        }

        const { data, error, count } = await query.range(from, to);

        if (error) throw error;
        if (!data || data.length === 0) return { items: [], count: count ?? 0 };

        // Fetch profiles separately to get owner emails
        const userIds = [...new Set(data.map(item => item.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.email]) || []);
        const items = data.map(item => ({
          ...item,
          owner_email: profileMap.get(item.user_id),
        })) as UploadHistoryItemWithOwner[];

        return { items, count: count ?? 0 };
      } else {
        let query = supabase
          .from('publish_queue')
          .select(baseSelect, { count: 'exact' })
          .eq('user_id', user.id)
          .eq('status', 'published')
          .order('processed_at', { ascending: false });

        if (selectedChannelId && selectedChannelId !== 'all') {
          query = query.eq('youtube_channel_id', selectedChannelId);
        }

        const { data, error, count } = await query.range(from, to);

        if (error) throw error;
        return { items: (data || []) as UploadHistoryItemWithOwner[], count: count ?? 0 };
      }
    },
    enabled: !!user?.id,
  });

  // Real-time subscription for new uploads
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('upload-history-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'publish_queue',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newRecord = payload.new as any;
          
          // Only show toast and refetch when status changes to 'published'
          if (newRecord.status === 'published' && payload.old?.status !== 'published') {
            toast.success('🎉 Video uploaded successfully!', {
              description: 'Your video is now live on YouTube',
            });
            queryClient.invalidateQueries({ queryKey: ['upload-history'] });
            queryClient.invalidateQueries({ queryKey: ['publish-queue'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Calculate stats per channel (needs separate query for stats)
  const statsQuery = useQuery({
    queryKey: ['upload-history-stats', user?.id, isOwner],
    queryFn: async () => {
      if (!user?.id) return {};

      const baseSelect = `
        youtube_channel_id,
        processed_at,
        youtube_channel:youtube_channels(channel_title, channel_thumbnail)
      `;

      let query = supabase
        .from('publish_queue')
        .select(baseSelect)
        .eq('status', 'published');

      if (!isOwner) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const stats: Record<string, {
        totalUploads: number;
        lastUploadAt: string | null;
        channelTitle: string;
        channelThumbnail: string | null;
      }> = {};

      (data || []).forEach((item: any) => {
        const channelId = item.youtube_channel_id;
        if (!stats[channelId]) {
          stats[channelId] = {
            totalUploads: 0,
            lastUploadAt: null,
            channelTitle: item.youtube_channel?.channel_title || 'Unknown',
            channelThumbnail: item.youtube_channel?.channel_thumbnail || null,
          };
        }
        stats[channelId].totalUploads++;
        
        const processedAt = item.processed_at;
        if (processedAt && (!stats[channelId].lastUploadAt || processedAt > stats[channelId].lastUploadAt!)) {
          stats[channelId].lastUploadAt = processedAt;
        }
      });

      return stats;
    },
    enabled: !!user?.id,
  });

  const totalCount = historyQuery.data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    history: historyQuery.data?.items || [],
    channelStats: statsQuery.data || {},
    isLoading: historyQuery.isLoading || statsQuery.isLoading,
    error: historyQuery.error,
    refetch: historyQuery.refetch,
    totalCount,
    totalPages,
    hasMore: page < totalPages,
  };
}
