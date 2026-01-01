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
  youtube_video_url?: string | null;
}

export function useScrapedVideos(accountId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['scraped-videos', accountId],
    queryFn: async () => {
      if (!accountId) return [];

      // Get scraped videos
      const { data: videos, error } = await supabase
        .from('scraped_videos')
        .select('*')
        .eq('tiktok_account_id', accountId)
        .order('scraped_at', { ascending: false });

      if (error) throw error;

      // Get published queue items with YouTube URLs for these videos
      const videoIds = videos.map(v => v.id);
      const { data: queueItems } = await supabase
        .from('publish_queue')
        .select('scraped_video_id, youtube_video_url')
        .in('scraped_video_id', videoIds)
        .eq('status', 'published')
        .not('youtube_video_url', 'is', null);

      // Create a map of video ID to YouTube URL
      const youtubeUrlMap = new Map<string, string>();
      queueItems?.forEach(item => {
        if (item.youtube_video_url) {
          youtubeUrlMap.set(item.scraped_video_id, item.youtube_video_url);
        }
      });

      // Merge YouTube URLs into videos
      return videos.map(video => ({
        ...video,
        youtube_video_url: youtubeUrlMap.get(video.id) || null,
      })) as ScrapedVideo[];
    },
    enabled: !!user && !!accountId,
  });
}

export function useAllScrapedVideos() {
  const { user, isOwner } = useAuth();

  return useQuery({
    queryKey: ['scraped-videos', 'all', isOwner],
    queryFn: async () => {
      // Owner can see all scraped videos; regular users see their own via RLS
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

export function usePublishedVideosCount(accountId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['published-videos-count', accountId],
    queryFn: async () => {
      if (!accountId) return 0;

      const { count, error } = await supabase
        .from('scraped_videos')
        .select('*', { count: 'exact', head: true })
        .eq('tiktok_account_id', accountId)
        .eq('is_published', true);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user && !!accountId,
  });
}
