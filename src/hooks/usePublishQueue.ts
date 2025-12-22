import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PublishQueueItem {
  id: string;
  user_id: string;
  scraped_video_id: string;
  youtube_channel_id: string;
  schedule_id: string | null;
  scheduled_for: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  youtube_video_id: string | null;
  youtube_video_url: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QueueItemWithDetails extends PublishQueueItem {
  scraped_video?: {
    id: string;
    title: string | null;
    thumbnail_url: string | null;
    video_url: string;
    download_url: string | null;
  };
  youtube_channel?: {
    id: string;
    channel_title: string | null;
    channel_thumbnail: string | null;
  };
}

export function usePublishQueue() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queueQuery = useQuery({
    queryKey: ['publish-queue', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('publish_queue')
        .select(`
          *,
          scraped_video:scraped_videos(id, title, thumbnail_url, video_url, download_url),
          youtube_channel:youtube_channels(id, channel_title, channel_thumbnail)
        `)
        .eq('user_id', user.id)
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      return data as QueueItemWithDetails[];
    },
    enabled: !!user?.id,
  });

  const addToQueueMutation = useMutation({
    mutationFn: async (input: {
      scraped_video_id: string;
      youtube_channel_id: string;
      scheduled_for: string;
      schedule_id?: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('publish_queue')
        .insert({
          user_id: user.id,
          scraped_video_id: input.scraped_video_id,
          youtube_channel_id: input.youtube_channel_id,
          scheduled_for: input.scheduled_for,
          schedule_id: input.schedule_id || null,
          status: 'queued',
        })
        .select()
        .single();

      if (error) throw error;
      return data as PublishQueueItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publish-queue'] });
      toast.success('Video added to queue');
    },
    onError: (error) => {
      toast.error(`Failed to add to queue: ${error.message}`);
    },
  });

  const cancelQueueItemMutation = useMutation({
    mutationFn: async (queueItemId: string) => {
      const { error } = await supabase
        .from('publish_queue')
        .delete()
        .eq('id', queueItemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publish-queue'] });
      toast.success('Removed from queue');
    },
    onError: (error) => {
      toast.error(`Failed to remove from queue: ${error.message}`);
    },
  });

  const retryQueueItemMutation = useMutation({
    mutationFn: async (queueItemId: string) => {
      const { data, error } = await supabase
        .from('publish_queue')
        .update({
          status: 'queued',
          error_message: null,
          retry_count: 0,
        })
        .eq('id', queueItemId)
        .select()
        .single();

      if (error) throw error;
      return data as PublishQueueItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publish-queue'] });
      toast.success('Retry scheduled');
    },
    onError: (error) => {
      toast.error(`Failed to retry: ${error.message}`);
    },
  });

  // Grouped by status for easy filtering
  const queuedItems = queueQuery.data?.filter(item => item.status === 'queued') || [];
  const processingItems = queueQuery.data?.filter(item => item.status === 'processing') || [];
  const completedItems = queueQuery.data?.filter(item => item.status === 'completed') || [];
  const failedItems = queueQuery.data?.filter(item => item.status === 'failed') || [];

  return {
    queue: queueQuery.data || [],
    queuedItems,
    processingItems,
    completedItems,
    failedItems,
    isLoading: queueQuery.isLoading,
    error: queueQuery.error,
    addToQueue: addToQueueMutation.mutateAsync,
    cancelQueueItem: cancelQueueItemMutation.mutateAsync,
    retryQueueItem: retryQueueItemMutation.mutateAsync,
    refetch: queueQuery.refetch,
  };
}
