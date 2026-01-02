import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { QueueItemWithDetails } from './usePublishQueue';

export interface UploadHistoryItemWithOwner extends QueueItemWithDetails {
  owner_email?: string;
}

export function useUploadHistory(selectedChannelId?: string) {
  const { user, isOwner } = useAuth();
  const queryClient = useQueryClient();

  const historyQuery = useQuery({
    queryKey: ['upload-history', user?.id, selectedChannelId, isOwner],
    queryFn: async () => {
      if (!user?.id) return [];

      const baseSelect = `
        *,
        scraped_video:scraped_videos(id, title, thumbnail_url, video_url, download_url, tiktok_account_id),
        youtube_channel:youtube_channels(id, channel_id, channel_handle, channel_title, channel_thumbnail, tiktok_account_id)
      `;

      // If owner, fetch all history; otherwise only user's history
      if (isOwner) {
        let query = supabase
          .from('publish_queue')
          .select(baseSelect)
          .eq('status', 'published')
          .order('processed_at', { ascending: false });

        if (selectedChannelId && selectedChannelId !== 'all') {
          query = query.eq('youtube_channel_id', selectedChannelId);
        }

        const { data, error } = await query.limit(100);

        if (error) throw error;
        if (!data || data.length === 0) return [];

        // Fetch profiles separately to get owner emails
        const userIds = [...new Set(data.map(item => item.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.email]) || []);
        return data.map(item => ({
          ...item,
          owner_email: profileMap.get(item.user_id),
        })) as UploadHistoryItemWithOwner[];
      } else {
        let query = supabase
          .from('publish_queue')
          .select(baseSelect)
          .eq('user_id', user.id)
          .eq('status', 'published')
          .order('processed_at', { ascending: false });

        if (selectedChannelId && selectedChannelId !== 'all') {
          query = query.eq('youtube_channel_id', selectedChannelId);
        }

        const { data, error } = await query.limit(100);

        if (error) throw error;
        return data as UploadHistoryItemWithOwner[];
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

  // Calculate stats per channel
  const channelStats = useMemo(() => {
    if (!historyQuery.data) return {};

    const stats: Record<string, {
      totalUploads: number;
      lastUploadAt: string | null;
      channelTitle: string;
      channelThumbnail: string | null;
    }> = {};

    historyQuery.data.forEach((item) => {
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
  }, [historyQuery.data]);

  return {
    history: historyQuery.data || [],
    channelStats,
    isLoading: historyQuery.isLoading,
    error: historyQuery.error,
    refetch: historyQuery.refetch,
  };
}
