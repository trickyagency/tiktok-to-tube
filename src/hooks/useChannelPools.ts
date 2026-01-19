import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type RotationStrategy = 'quota_based' | 'round_robin' | 'priority';

export interface ChannelPool {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  rotation_strategy: RotationStrategy;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  members?: PoolMember[];
}

export interface PoolMember {
  id: string;
  pool_id: string;
  youtube_channel_id: string;
  priority: number;
  is_fallback_only: boolean;
  created_at: string;
  youtube_channel?: {
    id: string;
    channel_title: string | null;
    channel_thumbnail: string | null;
    auth_status: string | null;
    subscriber_count: number | null;
  };
}

export interface CreatePoolInput {
  name: string;
  description?: string;
  rotation_strategy?: RotationStrategy;
}

export interface UpdatePoolInput {
  id: string;
  name?: string;
  description?: string;
  rotation_strategy?: RotationStrategy;
  is_active?: boolean;
}

export function useChannelPools() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: pools = [], isLoading, error, refetch } = useQuery({
    queryKey: ['channel-pools', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channel_rotation_pools')
        .select(`
          *,
          members:channel_pool_members(
            *,
            youtube_channel:youtube_channels(
              id,
              channel_title,
              channel_thumbnail,
              auth_status,
              subscriber_count
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Sort members by priority within each pool
      return (data || []).map(pool => ({
        ...pool,
        members: (pool.members || []).sort((a: PoolMember, b: PoolMember) => a.priority - b.priority)
      })) as ChannelPool[];
    },
    enabled: !!user,
  });

  const createPoolMutation = useMutation({
    mutationFn: async (input: CreatePoolInput) => {
      const { data, error } = await supabase
        .from('channel_rotation_pools')
        .insert({
          user_id: user?.id,
          name: input.name,
          description: input.description || null,
          rotation_strategy: input.rotation_strategy || 'quota_based',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-pools'] });
      toast.success('Channel pool created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create pool: ${error.message}`);
    },
  });

  const updatePoolMutation = useMutation({
    mutationFn: async (input: UpdatePoolInput) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from('channel_rotation_pools')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-pools'] });
      toast.success('Pool updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update pool: ${error.message}`);
    },
  });

  const deletePoolMutation = useMutation({
    mutationFn: async (poolId: string) => {
      const { error } = await supabase
        .from('channel_rotation_pools')
        .delete()
        .eq('id', poolId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-pools'] });
      toast.success('Pool deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete pool: ${error.message}`);
    },
  });

  const addChannelToPoolMutation = useMutation({
    mutationFn: async ({ poolId, channelId, priority = 0, isFallbackOnly = false }: {
      poolId: string;
      channelId: string;
      priority?: number;
      isFallbackOnly?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('channel_pool_members')
        .insert({
          pool_id: poolId,
          youtube_channel_id: channelId,
          priority,
          is_fallback_only: isFallbackOnly,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-pools'] });
      toast.success('Channel added to pool');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add channel: ${error.message}`);
    },
  });

  const removeChannelFromPoolMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('channel_pool_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-pools'] });
      toast.success('Channel removed from pool');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove channel: ${error.message}`);
    },
  });

  const updateMemberPriorityMutation = useMutation({
    mutationFn: async ({ memberId, priority, isFallbackOnly }: {
      memberId: string;
      priority?: number;
      isFallbackOnly?: boolean;
    }) => {
      const updates: any = {};
      if (priority !== undefined) updates.priority = priority;
      if (isFallbackOnly !== undefined) updates.is_fallback_only = isFallbackOnly;

      const { error } = await supabase
        .from('channel_pool_members')
        .update(updates)
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-pools'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update priority: ${error.message}`);
    },
  });

  const reorderChannelsMutation = useMutation({
    mutationFn: async ({ poolId, memberIds }: { poolId: string; memberIds: string[] }) => {
      // Update priority for each member based on position
      const updates = memberIds.map((memberId, index) => 
        supabase
          .from('channel_pool_members')
          .update({ priority: index })
          .eq('id', memberId)
          .eq('pool_id', poolId)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-pools'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to reorder channels: ${error.message}`);
    },
  });

  return {
    pools,
    isLoading,
    error,
    refetch,
    createPool: createPoolMutation.mutateAsync,
    updatePool: updatePoolMutation.mutateAsync,
    deletePool: deletePoolMutation.mutateAsync,
    addChannelToPool: addChannelToPoolMutation.mutateAsync,
    removeChannelFromPool: removeChannelFromPoolMutation.mutateAsync,
    updateMemberPriority: updateMemberPriorityMutation.mutateAsync,
    reorderChannels: reorderChannelsMutation.mutateAsync,
    isCreating: createPoolMutation.isPending,
    isUpdating: updatePoolMutation.isPending,
    isDeleting: deletePoolMutation.isPending,
  };
}
