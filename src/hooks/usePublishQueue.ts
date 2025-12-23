import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';

export interface PublishQueueItem {
  id: string;
  user_id: string;
  scraped_video_id: string;
  youtube_channel_id: string;
  schedule_id: string | null;
  scheduled_for: string;
  status: 'queued' | 'processing' | 'uploading' | 'published' | 'failed' | 'cancelled';
  youtube_video_id: string | null;
  youtube_video_url: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  progress_phase: string | null;
  progress_percentage: number;
}

export interface QueueItemWithDetails extends PublishQueueItem {
  scraped_video?: {
    id: string;
    title: string | null;
    thumbnail_url: string | null;
    video_url: string;
    download_url: string | null;
    tiktok_account_id: string;
    tiktok_account?: {
      id: string;
      username: string;
      avatar_url: string | null;
    };
  };
  youtube_channel?: {
    id: string;
    channel_title: string | null;
    channel_thumbnail: string | null;
    tiktok_account_id: string | null;
  };
}

export function usePublishQueue() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const processingToastsRef = useRef<Set<string>>(new Set());

  const queueQuery = useQuery({
    queryKey: ['publish-queue', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('publish_queue')
        .select(`
          *,
          scraped_video:scraped_videos(
            id, title, thumbnail_url, video_url, download_url, tiktok_account_id,
            tiktok_account:tiktok_accounts(id, username, avatar_url)
          ),
          youtube_channel:youtube_channels(id, channel_title, channel_thumbnail, tiktok_account_id)
        `)
        .eq('user_id', user.id)
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      return data as QueueItemWithDetails[];
    },
    enabled: !!user?.id,
  });

  // Real-time subscription for progress updates and status changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('publish-queue-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'publish_queue',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newRecord = payload.new as PublishQueueItem;
          const oldRecord = payload.old as PublishQueueItem | undefined;

          if (payload.eventType === 'UPDATE' && newRecord && oldRecord) {
            // Started processing
            if (newRecord.status === 'processing' && oldRecord.status === 'queued') {
              processingToastsRef.current.add(newRecord.id);
              toast.loading('Processing video...', {
                id: `upload-${newRecord.id}`,
                description: 'Downloading from TikTok...',
              });
            }
            // Phase/progress update during processing
            else if (newRecord.status === 'processing' && processingToastsRef.current.has(newRecord.id)) {
              const phaseLabels: Record<string, string> = {
                downloading: 'Downloading from TikTok...',
                uploading: 'Uploading to YouTube...',
                finalizing: 'Finalizing upload...',
              };
              const description = newRecord.progress_phase 
                ? `${phaseLabels[newRecord.progress_phase] || newRecord.progress_phase} (${newRecord.progress_percentage}%)`
                : `Progress: ${newRecord.progress_percentage}%`;
              
              toast.loading('Processing video...', {
                id: `upload-${newRecord.id}`,
                description,
              });
            }
            // Published
            else if (newRecord.status === 'published' && oldRecord.status !== 'published') {
              processingToastsRef.current.delete(newRecord.id);
              toast.success('Video uploaded successfully!', {
                id: `upload-${newRecord.id}`,
                description: 'Your video is now live on YouTube',
                action: newRecord.youtube_video_url ? {
                  label: 'View',
                  onClick: () => window.open(newRecord.youtube_video_url!, '_blank'),
                } : undefined,
              });
            }
            // Failed
            else if (newRecord.status === 'failed' && oldRecord.status !== 'failed') {
              processingToastsRef.current.delete(newRecord.id);
              toast.error('Upload failed', {
                id: `upload-${newRecord.id}`,
                description: newRecord.error_message || 'An error occurred during upload',
              });
            }
          }

          // Refetch to update UI
          queryClient.invalidateQueries({ queryKey: ['publish-queue'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

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
          progress_phase: null,
          progress_percentage: 0,
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

  const retryAllFailedMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get all failed items
      const { data: failedItems, error: fetchError } = await supabase
        .from('publish_queue')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'failed');

      if (fetchError) throw fetchError;
      if (!failedItems?.length) throw new Error('No failed items to retry');

      // Update all to queued status
      const { error } = await supabase
        .from('publish_queue')
        .update({
          status: 'queued',
          error_message: null,
          retry_count: 0,
          progress_phase: null,
          progress_percentage: 0,
        })
        .eq('user_id', user.id)
        .eq('status', 'failed');

      if (error) throw error;
      return failedItems.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['publish-queue'] });
      toast.success(`${count} failed upload${count > 1 ? 's' : ''} queued for retry`);
    },
    onError: (error) => {
      toast.error(`Failed to retry: ${error.message}`);
    },
  });

  // Grouped by status for easy filtering
  const queuedItems = queueQuery.data?.filter(item => item.status === 'queued') || [];
  const processingItems = queueQuery.data?.filter(item => item.status === 'processing' || item.status === 'uploading') || [];
  const publishedItems = queueQuery.data?.filter(item => item.status === 'published') || [];
  const failedItems = queueQuery.data?.filter(item => item.status === 'failed') || [];

  return {
    queue: queueQuery.data || [],
    queuedItems,
    processingItems,
    publishedItems,
    failedItems,
    isLoading: queueQuery.isLoading,
    error: queueQuery.error,
    addToQueue: addToQueueMutation.mutateAsync,
    cancelQueueItem: cancelQueueItemMutation.mutateAsync,
    retryQueueItem: retryQueueItemMutation.mutateAsync,
    retryAllFailed: retryAllFailedMutation.mutateAsync,
    isRetryingAll: retryAllFailedMutation.isPending,
    refetch: queueQuery.refetch,
  };
}
