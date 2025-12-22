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

      const usersWithRoles: UserWithRole[] = profiles?.map(profile => ({
        id: profile.id,
        user_id: profile.user_id,
        email: profile.email,
        full_name: profile.full_name,
        created_at: profile.created_at,
        role: roleMap.get(profile.user_id) || 'user',
      })) || [];

      return usersWithRoles;
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
