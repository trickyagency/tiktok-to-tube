import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function usePlatformStats() {
  const { user, isOwner } = useAuth();

  return useQuery({
    queryKey: ['platform-stats', isOwner],
    queryFn: async () => {
      // Count total published videos from publish_queue
      // Owners can see all, regular users see their own via RLS
      const { count, error } = await supabase
        .from('publish_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published');

      if (error) throw error;

      return {
        totalPublishedVideos: count || 0,
      };
    },
    enabled: !!user,
  });
}
