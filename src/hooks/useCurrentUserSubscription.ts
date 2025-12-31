import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CurrentUserSubscriptionData {
  planId: string;
  planName: string;
  maxVideosPerDay: number;
  isUnlimited: boolean;
  status: string;
}

export function useCurrentUserSubscription() {
  const { user, isOwner } = useAuth();

  return useQuery({
    queryKey: ['current-user-subscription', user?.id],
    queryFn: async (): Promise<CurrentUserSubscriptionData> => {
      // Owner gets unlimited access
      if (isOwner) {
        return {
          planId: 'scale',
          planName: 'Scale (Owner)',
          maxVideosPerDay: 999999,
          isUnlimited: true,
          status: 'active'
        };
      }

      // Fetch user subscription with plan details
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('plan_id, status')
        .eq('user_id', user?.id ?? '')
        .eq('status', 'active')
        .maybeSingle();

      if (subError) throw subError;

      // Fetch plan details for max_videos_per_day
      const planId = subscription?.plan_id || 'basic';
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('id, name, max_videos_per_day')
        .eq('id', planId)
        .single();

      if (planError) throw planError;

      return {
        planId: plan?.id || 'basic',
        planName: plan?.name || 'Basic',
        maxVideosPerDay: plan?.max_videos_per_day || 2,
        isUnlimited: false,
        status: subscription?.status || 'none'
      };
    },
    enabled: !!user,
  });
}
