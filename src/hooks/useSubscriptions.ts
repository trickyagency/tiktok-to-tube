import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price_monthly: number;
  max_videos_per_day: number;
  features: Record<string, boolean>;
  is_active: boolean;
  created_at: string;
}

export interface AccountSubscription {
  id: string;
  tiktok_account_id: string;
  user_id: string;
  plan_id: string;
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  starts_at: string | null;
  expires_at: string | null;
  activated_by: string | null;
  activated_at: string | null;
  payment_confirmed_at: string | null;
  payment_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  plan?: SubscriptionPlan;
  tiktok_account?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  user?: {
    email: string;
    full_name: string | null;
  };
}

// Fetch all subscription plans
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });
}

// Fetch subscription for a specific TikTok account
export function useAccountSubscription(tiktokAccountId: string | undefined) {
  return useQuery({
    queryKey: ['account-subscription', tiktokAccountId],
    queryFn: async () => {
      if (!tiktokAccountId) return null;

      const { data, error } = await supabase
        .from('account_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('tiktok_account_id', tiktokAccountId)
        .maybeSingle();

      if (error) throw error;
      return data as AccountSubscription | null;
    },
    enabled: !!tiktokAccountId,
  });
}

// Fetch all subscriptions for the current user's accounts
export function useUserSubscriptions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-subscriptions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('account_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*),
          tiktok_account:tiktok_accounts(id, username, avatar_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AccountSubscription[];
    },
    enabled: !!user?.id,
  });
}

// Fetch all subscriptions (Owner only)
export function useAllSubscriptions() {
  const { isOwner } = useAuth();

  return useQuery({
    queryKey: ['all-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('account_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*),
          tiktok_account:tiktok_accounts(id, username, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      const userIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data.map(sub => ({
        ...sub,
        user: profileMap.get(sub.user_id) || { email: 'Unknown', full_name: null }
      })) as AccountSubscription[];
    },
    enabled: isOwner,
  });
}

// Create a subscription request
export function useCreateSubscriptionRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      tiktokAccountId, 
      planId 
    }: { 
      tiktokAccountId: string; 
      planId: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Check if subscription already exists
      const { data: existing } = await supabase
        .from('account_subscriptions')
        .select('id, status')
        .eq('tiktok_account_id', tiktokAccountId)
        .maybeSingle();

      if (existing) {
        // Update existing subscription request
        const { error } = await supabase
          .from('account_subscriptions')
          .update({
            plan_id: planId,
            status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
        return { updated: true };
      }

      // Create new subscription request
      const { error } = await supabase
        .from('account_subscriptions')
        .insert({
          tiktok_account_id: tiktokAccountId,
          user_id: user.id,
          plan_id: planId,
          status: 'pending'
        });

      if (error) throw error;
      return { created: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['all-subscriptions'] });
      toast.success('Subscription request submitted');
    },
    onError: (error) => {
      toast.error('Failed to submit subscription request: ' + error.message);
    },
  });
}

// Activate a subscription (Owner only)
export function useActivateSubscription() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      subscriptionId,
      startsAt,
      expiresAt,
      paymentNotes
    }: {
      subscriptionId: string;
      startsAt: Date;
      expiresAt: Date;
      paymentNotes?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('account_subscriptions')
        .update({
          status: 'active',
          starts_at: startsAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          activated_by: user.id,
          activated_at: new Date().toISOString(),
          payment_confirmed_at: new Date().toISOString(),
          payment_notes: paymentNotes || null
        })
        .eq('id', subscriptionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['all-subscriptions'] });
      toast.success('Subscription activated');
    },
    onError: (error) => {
      toast.error('Failed to activate subscription: ' + error.message);
    },
  });
}

// Cancel a subscription
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { error } = await supabase
        .from('account_subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', subscriptionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['all-subscriptions'] });
      toast.success('Subscription cancelled');
    },
    onError: (error) => {
      toast.error('Failed to cancel subscription: ' + error.message);
    },
  });
}

// Update subscription plan or extend (Owner only)
export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subscriptionId,
      planId,
      expiresAt,
      status
    }: {
      subscriptionId: string;
      planId?: string;
      expiresAt?: Date;
      status?: string;
    }) => {
      const updates: Record<string, unknown> = {};
      if (planId) updates.plan_id = planId;
      if (expiresAt) updates.expires_at = expiresAt.toISOString();
      if (status) updates.status = status;

      const { error } = await supabase
        .from('account_subscriptions')
        .update(updates)
        .eq('id', subscriptionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['all-subscriptions'] });
      toast.success('Subscription updated');
    },
    onError: (error) => {
      toast.error('Failed to update subscription: ' + error.message);
    },
  });
}

// Delete a subscription request (before activation)
export function useDeleteSubscriptionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { error } = await supabase
        .from('account_subscriptions')
        .delete()
        .eq('id', subscriptionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['all-subscriptions'] });
      toast.success('Subscription request deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete subscription request: ' + error.message);
    },
  });
}
