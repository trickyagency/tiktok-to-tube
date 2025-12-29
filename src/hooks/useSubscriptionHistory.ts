import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SubscriptionHistoryEntry {
  id: string;
  user_id: string;
  action: 'created' | 'renewed' | 'upgraded' | 'downgraded' | 'cancelled' | 'expired' | 'updated';
  plan_id: string | null;
  account_count: number | null;
  previous_plan_id: string | null;
  previous_account_count: number | null;
  expires_at: string | null;
  notes: string | null;
  performed_by: string | null;
  created_at: string;
  // Joined data
  plan?: { id: string; name: string } | null;
  previous_plan?: { id: string; name: string } | null;
  performer?: { email: string; full_name: string | null } | null;
}

// Fetch current user's subscription history
export function useSubscriptionHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['subscription-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('subscription_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch plan names
      const planIds = [...new Set([
        ...data.map(h => h.plan_id).filter(Boolean),
        ...data.map(h => h.previous_plan_id).filter(Boolean)
      ])] as string[];

      const performerIds = [...new Set(data.map(h => h.performed_by).filter(Boolean))] as string[];

      const [plansResult, profilesResult] = await Promise.all([
        planIds.length > 0
          ? supabase.from('subscription_plans').select('id, name').in('id', planIds)
          : { data: [] },
        performerIds.length > 0
          ? supabase.from('profiles').select('user_id, email, full_name').in('user_id', performerIds)
          : { data: [] }
      ]);

      const planMap = new Map((plansResult.data || []).map(p => [p.id, p]));
      const profileMap = new Map((profilesResult.data || []).map(p => [p.user_id, p]));

      return data.map(entry => ({
        ...entry,
        plan: entry.plan_id ? planMap.get(entry.plan_id) : null,
        previous_plan: entry.previous_plan_id ? planMap.get(entry.previous_plan_id) : null,
        performer: entry.performed_by ? profileMap.get(entry.performed_by) : null,
      })) as SubscriptionHistoryEntry[];
    },
    enabled: !!user?.id,
  });
}

// Fetch subscription history for a specific user (Owner only)
export function useUserSubscriptionHistory(userId: string | undefined) {
  const { isOwner } = useAuth();

  return useQuery({
    queryKey: ['subscription-history', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('subscription_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch plan names and performers
      const planIds = [...new Set([
        ...data.map(h => h.plan_id).filter(Boolean),
        ...data.map(h => h.previous_plan_id).filter(Boolean)
      ])] as string[];

      const performerIds = [...new Set(data.map(h => h.performed_by).filter(Boolean))] as string[];

      const [plansResult, profilesResult] = await Promise.all([
        planIds.length > 0
          ? supabase.from('subscription_plans').select('id, name').in('id', planIds)
          : { data: [] },
        performerIds.length > 0
          ? supabase.from('profiles').select('user_id, email, full_name').in('user_id', performerIds)
          : { data: [] }
      ]);

      const planMap = new Map((plansResult.data || []).map(p => [p.id, p]));
      const profileMap = new Map((profilesResult.data || []).map(p => [p.user_id, p]));

      return data.map(entry => ({
        ...entry,
        plan: entry.plan_id ? planMap.get(entry.plan_id) : null,
        previous_plan: entry.previous_plan_id ? planMap.get(entry.previous_plan_id) : null,
        performer: entry.performed_by ? profileMap.get(entry.performed_by) : null,
      })) as SubscriptionHistoryEntry[];
    },
    enabled: !!userId && isOwner,
  });
}
