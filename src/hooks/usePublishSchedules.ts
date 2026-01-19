import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PublishSchedule {
  id: string;
  user_id: string;
  tiktok_account_id: string;
  youtube_channel_id: string;
  channel_pool_id: string | null;
  schedule_name: string;
  videos_per_day: number;
  publish_times: string[]; // Array of HH:MM times
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduleInput {
  tiktok_account_id: string;
  youtube_channel_id: string;
  channel_pool_id?: string | null;
  schedule_name: string;
  videos_per_day: number;
  publish_times: string[];
  timezone: string;
}

export function usePublishSchedules() {
  const { user, isOwner } = useAuth();
  const queryClient = useQueryClient();

  const schedulesQuery = useQuery({
    queryKey: ['publish-schedules', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('publish_schedules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Parse publish_times from JSONB
      return (data || []).map(schedule => ({
        ...schedule,
        publish_times: Array.isArray(schedule.publish_times) 
          ? schedule.publish_times 
          : JSON.parse(schedule.publish_times as string || '[]')
      })) as PublishSchedule[];
    },
    enabled: !!user?.id,
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (input: CreateScheduleInput) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Check if ANY schedule already exists for this YouTube channel (active or paused)
      const { data: existingSchedule } = await supabase
        .from('publish_schedules')
        .select('id, is_active')
        .eq('youtube_channel_id', input.youtube_channel_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingSchedule) {
        const status = existingSchedule.is_active ? 'active' : 'paused';
        throw new Error(`A ${status} schedule already exists for this YouTube channel. Please ${existingSchedule.is_active ? 'edit' : 'activate or edit'} the existing schedule instead.`);
      }

      // Check subscription limit for videos per day (skip for owner - unlimited)
      if (!isOwner) {
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select('plan_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (subscription) {
          const { data: plan } = await supabase
            .from('subscription_plans')
            .select('max_videos_per_day')
            .eq('id', subscription.plan_id)
            .single();

          if (plan && input.publish_times.length > plan.max_videos_per_day) {
            throw new Error(`Your subscription allows up to ${plan.max_videos_per_day} videos per day. Please upgrade to add more.`);
          }
        }
      }

      const { data, error } = await supabase
        .from('publish_schedules')
        .insert({
          user_id: user.id,
          tiktok_account_id: input.tiktok_account_id,
          youtube_channel_id: input.youtube_channel_id,
          channel_pool_id: input.channel_pool_id || null,
          schedule_name: input.schedule_name,
          videos_per_day: input.videos_per_day,
          publish_times: input.publish_times,
          timezone: input.timezone,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PublishSchedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publish-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['publish-queue'] });
      toast.success('Schedule created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create schedule: ${error.message}`);
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PublishSchedule> & { id: string }) => {
      const { data, error } = await supabase
        .from('publish_schedules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PublishSchedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publish-schedules'] });
      toast.success('Schedule updated');
    },
    onError: (error) => {
      toast.error(`Failed to update schedule: ${error.message}`);
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await supabase
        .from('publish_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publish-schedules'] });
      toast.success('Schedule deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete schedule: ${error.message}`);
    },
  });

  const toggleScheduleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      // If trying to activate, check for active subscription first (skip for owner - unlimited)
      if (is_active && !isOwner) {
        const { data: subscription, error: subError } = await supabase
          .from('user_subscriptions')
          .select('status')
          .eq('user_id', user?.id ?? '')
          .eq('status', 'active')
          .maybeSingle();

        if (subError) throw subError;

        if (!subscription) {
          throw new Error('You need an active subscription to activate schedules. Please subscribe or renew your subscription.');
        }
      }

      const { data, error } = await supabase
        .from('publish_schedules')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PublishSchedule;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['publish-schedules'] });
      toast.success(data.is_active ? 'Schedule activated' : 'Schedule paused');
    },
    onError: (error) => {
      toast.error(`Failed to toggle schedule: ${error.message}`);
    },
  });

  return {
    schedules: schedulesQuery.data || [],
    isLoading: schedulesQuery.isLoading,
    error: schedulesQuery.error,
    createSchedule: createScheduleMutation.mutateAsync,
    isCreating: createScheduleMutation.isPending,
    updateSchedule: updateScheduleMutation.mutateAsync,
    deleteSchedule: deleteScheduleMutation.mutateAsync,
    isDeleting: deleteScheduleMutation.isPending,
    toggleSchedule: toggleScheduleMutation.mutateAsync,
    refetch: schedulesQuery.refetch,
  };
}
