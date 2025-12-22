import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserWithRole {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  role: 'owner' | 'admin' | 'user';
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

      // Map auth metadata by user_id
      const authMap = new Map<string, AuthMetadata>();
      if (!authError && authMetadata) {
        (authMetadata as AuthMetadata[]).forEach(meta => {
          authMap.set(meta.user_id, meta);
        });
      }

      // Map roles to users
      const roleMap = new Map<string, 'owner' | 'admin' | 'user'>();
      roles?.forEach(r => {
        // Priority: owner > admin > user
        const current = roleMap.get(r.user_id);
        if (!current) {
          roleMap.set(r.user_id, r.role as 'owner' | 'admin' | 'user');
        } else if (r.role === 'owner') {
          roleMap.set(r.user_id, 'owner');
        } else if (r.role === 'admin' && current !== 'owner') {
          roleMap.set(r.user_id, 'admin');
        }
      });

      const usersWithRoles: UserWithRole[] = profiles?.map(profile => {
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
    mutationFn: async ({ email, role }: { email: string; role: 'user' | 'admin' }) => {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email, role },
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
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      // First cancel the old invitation
      await supabase
        .from('pending_invitations')
        .update({ status: 'cancelled' })
        .eq('email', email)
        .eq('status', 'pending');

      // Then send a new one
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email, role },
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

export function usePromoteToAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

      if (error) {
        // Check if role already exists
        if (error.code === '23505') {
          throw new Error('User already has this role');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('User promoted to admin');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRemoveAdminRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('Admin role removed');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
