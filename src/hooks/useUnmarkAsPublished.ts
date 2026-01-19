import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useUnmarkAsPublished() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ videoId }: { videoId: string }) => {
      const { error } = await supabase
        .from('scraped_videos')
        .update({
          is_published: false,
          published_at: null,
          published_via: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', videoId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scraped-videos'] });
      queryClient.invalidateQueries({ queryKey: ['tiktok-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['published-videos-count'] });
      toast.success('Video unmarked as published', {
        description: 'The video is now available for automation.',
      });
    },
    onError: (error) => {
      console.error('Failed to unmark video:', error);
      toast.error('Failed to unmark video', {
        description: 'Please try again.',
      });
    },
  });
}
