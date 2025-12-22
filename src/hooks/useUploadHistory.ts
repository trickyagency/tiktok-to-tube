import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { QueueItemWithDetails } from './usePublishQueue';

export function useUploadHistory(selectedChannelId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const historyQuery = useQuery({
    queryKey: ['upload-history', user?.id, selectedChannelId],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('publish_queue')
        .select(`
          *,
          scraped_video:scraped_videos(id, title, thumbnail_url, video_url, download_url),
          youtube_channel:youtube_channels(id, channel_title, channel_thumbnail)
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('processed_at', { ascending: false });

      if (selectedChannelId && selectedChannelId !== 'all') {
        query = query.eq('youtube_channel_id', selectedChannelId);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return data as QueueItemWithDetails[];
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
          
          // Only show toast and refetch when status changes to 'completed'
          if (newRecord.status === 'completed' && payload.old?.status !== 'completed') {
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
