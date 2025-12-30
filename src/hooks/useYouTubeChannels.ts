import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { OAUTH_REDIRECT_URI } from '@/lib/api-config';

export interface YouTubeChannel {
  id: string;
  user_id: string;
  channel_id: string | null;
  channel_title: string | null;
  channel_thumbnail: string | null;
  subscriber_count: number;
  video_count: number;
  google_client_id: string | null;
  google_client_secret: string | null;
  google_redirect_uri: string | null;
  refresh_token: string | null;
  access_token: string | null;
  token_expires_at: string | null;
  auth_status: string | null;
  is_connected: boolean;
  tiktok_account_id: string | null;
  last_upload_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateChannelInput {
  channel_title: string;
  google_client_id: string;
  google_client_secret: string;
  google_redirect_uri?: string;
  tiktok_account_id?: string;
}

export function useYouTubeChannels() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const channelsQuery = useQuery({
    queryKey: ['youtube-channels', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('youtube_channels')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as YouTubeChannel[];
    },
    enabled: !!user?.id,
  });

  const createChannelMutation = useMutation({
    mutationFn: async (input: CreateChannelInput) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('youtube_channels')
        .insert({
          user_id: user.id,
          channel_title: input.channel_title,
          channel_id: '', // Will be filled after OAuth
          google_client_id: input.google_client_id,
          google_client_secret: input.google_client_secret,
          google_redirect_uri: input.google_redirect_uri || OAUTH_REDIRECT_URI,
          tiktok_account_id: input.tiktok_account_id || null,
          auth_status: 'pending',
          is_connected: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as YouTubeChannel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtube-channels'] });
      toast.success('Channel added! Now authorize with Google.');
    },
    onError: (error) => {
      toast.error(`Failed to add channel: ${error.message}`);
    },
  });

  const updateChannelMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<YouTubeChannel> & { id: string }) => {
      const { data, error } = await supabase
        .from('youtube_channels')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as YouTubeChannel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtube-channels'] });
    },
    onError: (error) => {
      toast.error(`Failed to update channel: ${error.message}`);
    },
  });

  const deleteChannelMutation = useMutation({
    mutationFn: async (channelId: string) => {
      const { error } = await supabase
        .from('youtube_channels')
        .delete()
        .eq('id', channelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtube-channels'] });
      toast.success('Channel removed');
    },
    onError: (error) => {
      toast.error(`Failed to remove channel: ${error.message}`);
    },
  });

  const startOAuth = async (channelId: string) => {
    try {
      console.log('[YouTube OAuth] Starting OAuth for channel:', channelId);
      
      // Use supabase.functions.invoke() for reliable edge function calls
      const { data, error } = await supabase.functions.invoke('youtube-oauth', {
        body: { action: 'start-auth', channel_id: channelId }
      });

      console.log('[YouTube OAuth] Response:', { data, error });

      if (error) {
        // Check if this is a FunctionsHttpError with more details
        const errorMessage = error.message || 'Unknown error';
        const errorContext = error.context ? JSON.stringify(error.context) : '';
        console.error('[YouTube OAuth] Edge function error:', error, errorContext);
        toast.error(`Failed to start OAuth: ${errorMessage}`);
        return;
      }

      if (data?.error) {
        console.error('[YouTube OAuth] Data error:', data.error);
        toast.error(data.error);
        return;
      }

      if (data?.oauth_url) {
        console.log('[YouTube OAuth] Opening OAuth URL:', data.oauth_url);
        // Open OAuth in a popup window
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        window.open(
          data.oauth_url,
          'youtube-oauth',
          `width=${width},height=${height},left=${left},top=${top}`
        );
      } else {
        console.error('[YouTube OAuth] No oauth_url in response:', data);
        toast.error('OAuth URL not received from server');
      }
    } catch (error: any) {
      console.error('[YouTube OAuth] Unexpected error:', error);
      // Provide detailed error info for debugging
      const errorDetails = error.message || String(error);
      toast.error(`Failed to start OAuth: ${errorDetails}`);
    }
  };

  const refreshToken = async (channelId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('youtube-oauth', {
        body: { action: 'refresh-token', channel_id: channelId }
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error(`Token refresh failed: ${error.message}`);
        return false;
      }

      if (data?.error) {
        toast.error(`Token refresh failed: ${data.error}`);
        return false;
      }

      queryClient.invalidateQueries({ queryKey: ['youtube-channels'] });
      toast.success('Token refreshed successfully');
      return true;
    } catch (error: any) {
      console.error('Token refresh error:', error);
      toast.error(`Failed to refresh token: ${error.message}`);
      return false;
    }
  };

  const checkForChannel = async (channelId: string): Promise<{ found: boolean; channelTitle?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('youtube-oauth', {
        body: { action: 'check-channel', channel_id: channelId }
      });

      if (error) {
        console.error('Edge function error:', error);
        return { found: false };
      }

      if (data?.found) {
        queryClient.invalidateQueries({ queryKey: ['youtube-channels'] });
        return { found: true, channelTitle: data.channelTitle };
      }
      
      return { found: false };
    } catch (error: any) {
      console.error('Failed to check for channel:', error.message);
      return { found: false };
    }
  };

  return {
    channels: channelsQuery.data || [],
    isLoading: channelsQuery.isLoading,
    error: channelsQuery.error,
    createChannel: createChannelMutation.mutateAsync,
    isCreating: createChannelMutation.isPending,
    updateChannel: updateChannelMutation.mutateAsync,
    deleteChannel: deleteChannelMutation.mutateAsync,
    isDeleting: deleteChannelMutation.isPending,
    startOAuth,
    refreshToken,
    checkForChannel,
    refetch: channelsQuery.refetch,
  };
}
