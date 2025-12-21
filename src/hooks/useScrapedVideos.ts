import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ScrapedVideo {
  id: string;
  user_id: string;
  tiktok_account_id: string;
  tiktok_video_id: string;
  title: string | null;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  download_url: string | null;
  storage_path: string | null;
  duration: number | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  is_downloaded: boolean;
  is_published: boolean;
  published_at: string | null;
  scraped_at: string;
  created_at: string;
  updated_at: string;
}

export function useScrapedVideos(accountId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['scraped-videos', accountId],
    queryFn: async () => {
      if (!accountId) return [];

      const { data, error } = await supabase
        .from('scraped_videos')
        .select('*')
        .eq('tiktok_account_id', accountId)
        .order('scraped_at', { ascending: false });

      if (error) throw error;
      return data as ScrapedVideo[];
    },
    enabled: !!user && !!accountId,
  });
}

export function useAllScrapedVideos() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['scraped-videos', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scraped_videos')
        .select('*')
        .order('scraped_at', { ascending: false });

      if (error) throw error;
      return data as ScrapedVideo[];
    },
    enabled: !!user,
  });
}

export function useScrapedVideosCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['scraped-videos-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('scraped_videos')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });
}
