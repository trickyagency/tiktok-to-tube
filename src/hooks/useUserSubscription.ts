import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { SubscriptionPlan } from './useSubscriptions';

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  account_count: number;
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  starts_at: string | null;
  expires_at: string | null;
  activated_by: string | null;
  activated_at: string | null;
  payment_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  plan?: SubscriptionPlan;
  user?: {
    email: string;
    full_name: string | null;
  };
}

// Fetch current user's subscription
export function useCurrentUserSubscription() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-subscription', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Fetch plan separately
      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', data.plan_id)
        .maybeSingle();

      return { ...data, plan } as UserSubscription;
    },
    enabled: !!user?.id,
  });
}

// Fetch subscription for a specific user (Owner only)
export function useUserSubscriptionById(userId: string | undefined) {
  const { isOwner } = useAuth();

  return useQuery({
    queryKey: ['user-subscription', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Fetch plan separately
      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', data.plan_id)
        .maybeSingle();

      return { ...data, plan } as UserSubscription;
    },
    enabled: !!userId && isOwner,
  });
}

// Fetch all user subscriptions (Owner only)
export function useAllUserSubscriptions() {
  const { isOwner } = useAuth();

  return useQuery({
    queryKey: ['all-user-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch plans
      const planIds = [...new Set(data.map(s => s.plan_id))];
      const { data: plans } = await supabase
        .from('subscription_plans')
        .select('*')
        .in('id', planIds);

      const planMap = new Map(plans?.map(p => [p.id, p]) || []);

      // Fetch user profiles separately
      const userIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data.map(sub => ({
        ...sub,
        plan: planMap.get(sub.plan_id),
        user: profileMap.get(sub.user_id) || { email: 'Unknown', full_name: null }
      })) as UserSubscription[];
    },
    enabled: isOwner,
  });
}

// Assign subscription to user (Owner only)
export function useAssignUserSubscription() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      userId,
      planId,
      accountCount,
      startsAt,
      expiresAt,
      paymentNotes
    }: {
      userId: string;
      planId: string;
      accountCount: number;
      startsAt?: Date;
      expiresAt?: Date;
      paymentNotes?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Check if subscription already exists for this user
      const { data: existing } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      const subscriptionData = {
        user_id: userId,
        plan_id: planId,
        account_count: accountCount,
        status: 'active',
        starts_at: startsAt?.toISOString() || new Date().toISOString(),
        expires_at: expiresAt?.toISOString() || null,
        activated_by: user.id,
        activated_at: new Date().toISOString(),
        payment_notes: paymentNotes || null,
      };

      if (existing) {
        // Update existing subscription
        const { error } = await supabase
          .from('user_subscriptions')
          .update(subscriptionData)
          .eq('id', existing.id);

        if (error) throw error;
        return { updated: true };
      }

      // Create new subscription
      const { error } = await supabase
        .from('user_subscriptions')
        .insert(subscriptionData);

      if (error) throw error;

      // Also update user_limits to sync account count
      const { data: existingLimit } = await supabase
        .from('user_limits')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingLimit) {
        await supabase
          .from('user_limits')
          .update({ max_tiktok_accounts: accountCount })
          .eq('user_id', userId);
      } else {
        await supabase
          .from('user_limits')
          .insert({ user_id: userId, max_tiktok_accounts: accountCount });
      }

      return { created: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['all-user-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-limits'] });
      toast.success('Subscription assigned successfully');
    },
    onError: (error) => {
      toast.error('Failed to assign subscription: ' + error.message);
    },
  });
}

// Update user subscription (Owner only)
export function useUpdateUserSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      planId,
      accountCount,
      expiresAt,
      status,
      paymentNotes
    }: {
      userId: string;
      planId?: string;
      accountCount?: number;
      expiresAt?: Date;
      status?: string;
      paymentNotes?: string;
    }) => {
      const updates: Record<string, unknown> = {};
      if (planId) updates.plan_id = planId;
      if (accountCount !== undefined) updates.account_count = accountCount;
      if (expiresAt) updates.expires_at = expiresAt.toISOString();
      if (status) updates.status = status;
      if (paymentNotes !== undefined) updates.payment_notes = paymentNotes;

      const { error } = await supabase
        .from('user_subscriptions')
        .update(updates)
        .eq('user_id', userId);

      if (error) throw error;

      // Sync account count to user_limits
      if (accountCount !== undefined) {
        await supabase
          .from('user_limits')
          .update({ max_tiktok_accounts: accountCount })
          .eq('user_id', userId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['all-user-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-limits'] });
      toast.success('Subscription updated');
    },
    onError: (error) => {
      toast.error('Failed to update subscription: ' + error.message);
    },
  });
}

// Cancel user subscription (Owner only)
export function useCancelUserSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ status: 'cancelled' })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['all-user-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('Subscription cancelled');
    },
    onError: (error) => {
      toast.error('Failed to cancel subscription: ' + error.message);
    },
  });
}
