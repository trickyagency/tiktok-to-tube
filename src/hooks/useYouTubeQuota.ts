import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const UPLOAD_QUOTA_COST = 1600;
const DEFAULT_DAILY_QUOTA = 10000;

export interface QuotaUsage {
  id: string;
  youtube_channel_id: string;
  date: string;
  uploads_count: number;
  quota_used: number;
  quota_limit: number;
  is_paused: boolean;
  created_at: string;
  updated_at: string;
  channel_title?: string;
  remainingQuota: number;
  remainingUploads: number;
  usagePercentage: number;
}

export function useYouTubeQuota(channelId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['youtube-quota', channelId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // First get channels for the user
      const { data: channels, error: channelsError } = await supabase
        .from('youtube_channels')
        .select('id, channel_title')
        .eq('user_id', user?.id ?? '');

      if (channelsError) throw channelsError;
      if (!channels || channels.length === 0) return [];

      const channelIds = channelId ? [channelId] : channels.map(c => c.id);
      
      // Get quota usage for today
      const { data: quotaData, error: quotaError } = await supabase
        .from('youtube_quota_usage')
        .select('*')
        .in('youtube_channel_id', channelIds)
        .eq('date', today);

      if (quotaError) throw quotaError;

      // Merge channel data with quota data
      return channels
        .filter(c => channelId ? c.id === channelId : true)
        .map(channel => {
          const quota = quotaData?.find(q => q.youtube_channel_id === channel.id);
          const quotaUsed = quota?.quota_used || 0;
          const quotaLimit = quota?.quota_limit || DEFAULT_DAILY_QUOTA;
          
          return {
            id: quota?.id || channel.id,
            youtube_channel_id: channel.id,
            date: today,
            uploads_count: quota?.uploads_count || 0,
            quota_used: quotaUsed,
            quota_limit: quotaLimit,
            is_paused: quota?.is_paused || false,
            created_at: quota?.created_at || new Date().toISOString(),
            updated_at: quota?.updated_at || new Date().toISOString(),
            channel_title: channel.channel_title,
            remainingQuota: quotaLimit - quotaUsed,
            remainingUploads: Math.floor((quotaLimit - quotaUsed) / UPLOAD_QUOTA_COST),
            usagePercentage: Math.round((quotaUsed / quotaLimit) * 100),
          } as QuotaUsage;
        });
    },
    enabled: !!user,
  });
}

export function useToggleChannelPause() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, isPaused }: { channelId: string; isPaused: boolean }) => {
      const today = new Date().toISOString().split('T')[0];
      
      // Upsert the quota usage record with pause status
      const { error } = await supabase
        .from('youtube_quota_usage')
        .upsert({
          youtube_channel_id: channelId,
          date: today,
          is_paused: isPaused,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'youtube_channel_id,date',
        });

      if (error) throw error;
      return isPaused;
    },
    onSuccess: (isPaused) => {
      queryClient.invalidateQueries({ queryKey: ['youtube-quota'] });
      toast.success(isPaused ? 'Channel uploads paused' : 'Channel uploads resumed');
    },
    onError: (error) => {
      toast.error('Failed to update pause status');
      console.error(error);
    },
  });
}
