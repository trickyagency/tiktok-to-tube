import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AuthMetadata {
  user_id: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  auth_created_at: string | null;
}

interface UserGrowthPoint {
  date: string;
  count: number;
}

interface InviteStats {
  pending: number;
  accepted: number;
  cancelled: number;
  expired: number;
}

interface AnalyticsData {
  totalUsers: number;
  verifiedUsers: number;
  activeUsers: number;
  pendingInvitations: number;
  userGrowth: UserGrowthPoint[];
  inviteStats: InviteStats;
  verificationRate: number;
  recentSignIns: { email: string; last_sign_in_at: string }[];
}

export function useAnalytics() {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: async (): Promise<AnalyticsData> => {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, created_at')
        .order('created_at', { ascending: true });

      if (profilesError) throw profilesError;

      // Fetch auth metadata
      const { data: authMetadata, error: authError } = await supabase
        .rpc('get_user_auth_metadata');

      // Fetch all invitations (not just pending)
      const { data: invitations, error: invitationsError } = await supabase
        .from('pending_invitations')
        .select('status, expires_at');

      if (invitationsError) throw invitationsError;

      // Map auth metadata
      const authMap = new Map<string, AuthMetadata>();
      if (!authError && authMetadata) {
        (authMetadata as AuthMetadata[]).forEach(meta => {
          authMap.set(meta.user_id, meta);
        });
      }

      // Calculate stats
      const totalUsers = profiles?.length || 0;
      
      let verifiedUsers = 0;
      let activeUsers = 0;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentSignIns: { email: string; last_sign_in_at: string }[] = [];

      profiles?.forEach(profile => {
        const auth = authMap.get(profile.user_id);
        if (auth?.email_confirmed_at) {
          verifiedUsers++;
        }
        if (auth?.last_sign_in_at && new Date(auth.last_sign_in_at) > thirtyDaysAgo) {
          activeUsers++;
          recentSignIns.push({
            email: profile.email,
            last_sign_in_at: auth.last_sign_in_at,
          });
        }
      });

      // Sort recent sign-ins by most recent
      recentSignIns.sort((a, b) => 
        new Date(b.last_sign_in_at).getTime() - new Date(a.last_sign_in_at).getTime()
      );

      // Calculate invitation stats
      const now = new Date();
      const inviteStats: InviteStats = {
        pending: 0,
        accepted: 0,
        cancelled: 0,
        expired: 0,
      };

      invitations?.forEach(inv => {
        if (inv.status === 'pending') {
          if (new Date(inv.expires_at) < now) {
            inviteStats.expired++;
          } else {
            inviteStats.pending++;
          }
        } else if (inv.status === 'accepted') {
          inviteStats.accepted++;
        } else if (inv.status === 'cancelled') {
          inviteStats.cancelled++;
        }
      });

      // Calculate user growth by day (last 30 days)
      const growthMap = new Map<string, number>();
      let cumulative = 0;
      
      profiles?.forEach(profile => {
        const date = new Date(profile.created_at).toISOString().split('T')[0];
        cumulative++;
        growthMap.set(date, cumulative);
      });

      // Fill in missing dates for the last 30 days
      const userGrowth: UserGrowthPoint[] = [];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      let lastCount = 0;
      // Find the count before our start date
      profiles?.forEach(profile => {
        const profileDate = new Date(profile.created_at);
        if (profileDate < startDate) {
          lastCount++;
        }
      });

      for (let i = 0; i <= 30; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Count users created on this date
        const usersOnDate = profiles?.filter(p => 
          new Date(p.created_at).toISOString().split('T')[0] === dateStr
        ).length || 0;
        
        lastCount += usersOnDate;
        userGrowth.push({ date: dateStr, count: lastCount });
      }

      const verificationRate = totalUsers > 0 
        ? Math.round((verifiedUsers / totalUsers) * 100) 
        : 0;

      return {
        totalUsers,
        verifiedUsers,
        activeUsers,
        pendingInvitations: inviteStats.pending,
        userGrowth,
        inviteStats,
        verificationRate,
        recentSignIns: recentSignIns.slice(0, 5),
      };
    },
  });
}
