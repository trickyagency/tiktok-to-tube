import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useApifyStatus() {
  return useQuery({
    queryKey: ['apify-status'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_apify_configured');
      
      if (error) {
        console.error('Error checking Apify status:', error);
        return false;
      }
      
      return data as boolean;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}
