import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useYouTubeQuotaRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('quota-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'youtube_quota_usage',
      }, (payload) => {
        console.log('Quota usage changed:', payload);
        queryClient.invalidateQueries({ queryKey: ['youtube-quota'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
