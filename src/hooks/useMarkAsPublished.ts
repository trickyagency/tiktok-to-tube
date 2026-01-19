import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface MarkResult {
  totalSubmitted: number;
  successfullyMarked: number;
  skipped: number;
  rejected: number;
  details: {
    url: string;
    status: 'marked' | 'skipped' | 'invalid' | 'wrong_account' | 'not_found';
    message: string;
  }[];
}

// Extract TikTok video ID from various URL formats
export function extractTikTokVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  
  const trimmedUrl = url.trim();
  
  // Format: https://www.tiktok.com/@username/video/1234567890123456789
  const videoMatch = trimmedUrl.match(/\/video\/(\d+)/);
  if (videoMatch) return videoMatch[1];
  
  // Format: https://vm.tiktok.com/ABC123/ or https://vt.tiktok.com/ABC123/
  // These are short URLs that redirect - we can't resolve them client-side
  // Return null for now (could be enhanced with server-side resolution)
  
  return null;
}

// Validate URL format
export function isValidTikTokUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  const trimmedUrl = url.trim();
  
  // Check for common TikTok URL patterns
  return (
    trimmedUrl.includes('tiktok.com') &&
    (
      trimmedUrl.includes('/video/') ||
      trimmedUrl.includes('vm.tiktok.com') ||
      trimmedUrl.includes('vt.tiktok.com')
    )
  );
}

// Parse multiple URLs from text input
export function parseVideoUrls(input: string): string[] {
  if (!input || typeof input !== 'string') return [];
  
  return input
    .split(/[\n\r]+/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && isValidTikTokUrl(line));
}

export function useMarkAsPublished() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      accountId,
      videoUrls,
    }: {
      accountId: string;
      videoUrls: string[];
    }): Promise<MarkResult> => {
      if (!user) throw new Error('Not authenticated');

      const results: MarkResult = {
        totalSubmitted: videoUrls.length,
        successfullyMarked: 0,
        skipped: 0,
        rejected: 0,
        details: [],
      };

      for (const url of videoUrls) {
        // Extract video ID
        const videoId = extractTikTokVideoId(url);
        
        if (!videoId) {
          // Check if it's a short URL that we can't resolve
          if (url.includes('vm.tiktok.com') || url.includes('vt.tiktok.com')) {
            results.rejected++;
            results.details.push({
              url,
              status: 'invalid',
              message: 'Short URLs not supported. Use the full video URL.',
            });
          } else {
            results.rejected++;
            results.details.push({
              url,
              status: 'invalid',
              message: 'Invalid TikTok URL format',
            });
          }
          continue;
        }

        // Check if video exists and belongs to this account
        const { data: video, error } = await supabase
          .from('scraped_videos')
          .select('id, is_published, tiktok_account_id, published_via')
          .eq('tiktok_video_id', videoId)
          .maybeSingle();

        if (error) {
          results.rejected++;
          results.details.push({
            url,
            status: 'not_found',
            message: `Database error: ${error.message}`,
          });
          continue;
        }

        if (!video) {
          results.rejected++;
          results.details.push({
            url,
            status: 'not_found',
            message: 'Video not found. Scrape the account first.',
          });
          continue;
        }

        if (video.tiktok_account_id !== accountId) {
          results.rejected++;
          results.details.push({
            url,
            status: 'wrong_account',
            message: 'Video belongs to a different TikTok account',
          });
          continue;
        }

        if (video.is_published) {
          results.skipped++;
          results.details.push({
            url,
            status: 'skipped',
            message: `Already marked as published${video.published_via ? ` (${video.published_via})` : ''}`,
          });
          continue;
        }

        // Mark as published
        const { error: updateError } = await supabase
          .from('scraped_videos')
          .update({
            is_published: true,
            published_at: new Date().toISOString(),
            published_via: 'manual',
            updated_at: new Date().toISOString(),
          })
          .eq('id', video.id);

        if (updateError) {
          results.rejected++;
          results.details.push({
            url,
            status: 'invalid',
            message: `Failed to update: ${updateError.message}`,
          });
          continue;
        }

        results.successfullyMarked++;
        results.details.push({
          url,
          status: 'marked',
          message: 'Successfully marked as published',
        });
      }

      return results;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scraped-videos'] });
      queryClient.invalidateQueries({ queryKey: ['tiktok-accounts'] });
      
      if (data.successfullyMarked > 0) {
        toast({
          title: 'Videos marked as published',
          description: `${data.successfullyMarked} video${data.successfullyMarked !== 1 ? 's' : ''} marked as already published.`,
        });
      } else if (data.skipped > 0 && data.rejected === 0) {
        toast({
          title: 'All videos already marked',
          description: 'All submitted videos were already marked as published.',
        });
      } else if (data.rejected > 0) {
        toast({
          title: 'Some videos could not be marked',
          description: `${data.rejected} video${data.rejected !== 1 ? 's' : ''} had issues.`,
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Failed to mark videos',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
