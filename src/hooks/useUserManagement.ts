import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserWithRole {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  role: 'owner' | 'user';
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  invited_by: string;
  invited_at: string;
  status: string;
  expires_at: string;
}

export interface UserLimits {
  id: string;
  user_id: string;
  max_tiktok_accounts: number;
  max_youtube_channels: number;
}

export interface UserWithLimitsAndUsage extends UserWithRole {
  limits: UserLimits | null;
  tiktok_count: number;
  youtube_count: number;
}

interface AuthMetadata {
  user_id: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  auth_created_at: string | null;
}

export function useAllUsers() {
  return useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Fetch auth metadata using the secure function
      const { data: authMetadata, error: authError } = await supabase
        .rpc('get_user_auth_metadata');

      // Fetch all user limits
      const { data: allLimits } = await supabase
        .from('user_limits')
        .select('*');

      // Fetch TikTok account counts per user
      const { data: tikTokCounts } = await supabase
        .from('tiktok_accounts')
        .select('user_id');

      // Fetch YouTube channel counts per user
      const { data: youtubeCounts } = await supabase
        .from('youtube_channels')
        .select('user_id');

      // Map auth metadata by user_id
      const authMap = new Map<string, AuthMetadata>();
      if (!authError && authMetadata) {
        (authMetadata as AuthMetadata[]).forEach(meta => {
          authMap.set(meta.user_id, meta);
        });
      }

      // Map limits by user_id
      const limitsMap = new Map<string, UserLimits>();
      allLimits?.forEach(limit => {
        limitsMap.set(limit.user_id, limit);
      });

      // Count TikTok accounts per user
      const tikTokCountMap = new Map<string, number>();
      tikTokCounts?.forEach(acc => {
        tikTokCountMap.set(acc.user_id, (tikTokCountMap.get(acc.user_id) || 0) + 1);
      });

      // Count YouTube channels per user
      const youtubeCountMap = new Map<string, number>();
      youtubeCounts?.forEach(ch => {
        youtubeCountMap.set(ch.user_id, (youtubeCountMap.get(ch.user_id) || 0) + 1);
      });

      // Map roles to users (only owner or user now, no admin)
      const roleMap = new Map<string, 'owner' | 'user'>();
      roles?.forEach(r => {
        if (r.role === 'owner') {
          roleMap.set(r.user_id, 'owner');
        }
      });

      const usersWithRoles: UserWithLimitsAndUsage[] = profiles?.map(profile => {
        const auth = authMap.get(profile.user_id);
        return {
          id: profile.id,
          user_id: profile.user_id,
          email: profile.email,
          full_name: profile.full_name,
          created_at: profile.created_at,
          role: roleMap.get(profile.user_id) || 'user',
          email_confirmed_at: auth?.email_confirmed_at || null,
          last_sign_in_at: auth?.last_sign_in_at || null,
          limits: limitsMap.get(profile.user_id) || null,
          tiktok_count: tikTokCountMap.get(profile.user_id) || 0,
          youtube_count: youtubeCountMap.get(profile.user_id) || 0,
        };
      }) || [];

      return usersWithRoles;
    },
  });
}

export function usePendingInvitations() {
  return useQuery({
    queryKey: ['pending-invitations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_invitations')
        .select('*')
        .eq('status', 'pending')
        .order('invited_at', { ascending: false });

      if (error) throw error;
      return data as PendingInvitation[];
    },
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email, role: 'user' },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('Invitation sent successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('pending_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
      toast.success('Invitation cancelled');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      // First cancel the old invitation
      await supabase
        .from('pending_invitations')
        .update({ status: 'cancelled' })
        .eq('email', email)
        .eq('status', 'pending');

      // Then send a new one (always as user)
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email, role: 'user' },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
      toast.success('Invitation resent');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
      toast.success('User deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateUserLimits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      maxTikTokAccounts, 
      maxYouTubeChannels 
    }: { 
      userId: string; 
      maxTikTokAccounts: number; 
      maxYouTubeChannels: number;
    }) => {
      // Try to upsert the limits
      const { error } = await supabase
        .from('user_limits')
        .upsert({
          user_id: userId,
          max_tiktok_accounts: maxTikTokAccounts,
          max_youtube_channels: maxYouTubeChannels,
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-account-limits'] });
      toast.success('User limits updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
