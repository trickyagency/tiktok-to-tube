import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useYouTubeChannelsRealtime() {
  const { user, isOwner } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    console.log('[Realtime] Setting up YouTube channels realtime subscriptions');

    // Subscribe to youtube_channels changes
    const channelsChannel = supabase
      .channel('youtube-channels-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'youtube_channels',
          // Owners see all channels, regular users see their own
          ...(isOwner ? {} : { filter: `user_id=eq.${user.id}` }),
        },
        (payload) => {
          const newChannel = payload.new as Record<string, unknown>;
          const oldChannel = payload.old as Record<string, unknown>;
          
          console.log('[Realtime] Channel updated:', {
            channelId: (newChannel.id as string)?.slice(0, 8),
            oldStatus: oldChannel?.auth_status,
            newStatus: newChannel?.auth_status,
          });
          
          // Invalidate queries to refetch fresh data
          queryClient.invalidateQueries({ queryKey: ['youtube-channels'] });
          
          // Show toast when auth_status changes
          if (oldChannel?.auth_status !== newChannel?.auth_status) {
            const channelTitle = newChannel.channel_title as string || 'Channel';
            
            if (newChannel.auth_status === 'connected') {
              toast.success(`${channelTitle} is now connected`, {
                description: 'Health check passed successfully',
              });
            } else if (newChannel.auth_status === 'quota_exceeded') {
              toast.warning(`${channelTitle} has exceeded quota`, {
                description: 'Uploads paused until quota resets at midnight PT',
              });
            } else if (newChannel.auth_status === 'failed' || newChannel.auth_status === 'token_revoked') {
              toast.error(`${channelTitle} has issues`, {
                description: 'Please reconnect or check credentials',
              });
            }
          }
          
          // Invalidate health queries too
          queryClient.invalidateQueries({ queryKey: ['channel-health', newChannel.id] });
          queryClient.invalidateQueries({ queryKey: ['all-channels-health'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'youtube_channels',
          ...(isOwner ? {} : { filter: `user_id=eq.${user.id}` }),
        },
        (payload) => {
          console.log('[Realtime] New channel added');
          queryClient.invalidateQueries({ queryKey: ['youtube-channels'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'youtube_channels',
        },
        (payload) => {
          console.log('[Realtime] Channel deleted');
          queryClient.invalidateQueries({ queryKey: ['youtube-channels'] });
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] youtube_channels subscription status:', status);
      });

    // Also subscribe to channel_health for health status updates
    const healthChannel = supabase
      .channel('channel-health-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channel_health',
        },
        (payload) => {
          console.log('[Realtime] channel_health updated:', {
            event: payload.eventType,
            channelId: (payload.new as Record<string, unknown>)?.channel_id,
          });
          
          // Invalidate all health-related queries
          queryClient.invalidateQueries({ queryKey: ['channel-health'] });
          queryClient.invalidateQueries({ queryKey: ['all-channels-health'] });
          queryClient.invalidateQueries({ queryKey: ['youtube-channels'] });
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] channel_health subscription status:', status);
      });

    return () => {
      console.log('[Realtime] Cleaning up YouTube channels subscriptions');
      supabase.removeChannel(channelsChannel);
      supabase.removeChannel(healthChannel);
    };
  }, [user, isOwner, queryClient]);
}
