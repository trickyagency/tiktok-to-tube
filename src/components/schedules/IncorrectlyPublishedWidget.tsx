import { useState } from 'react';
import { AlertTriangle, RefreshCw, Undo2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface IncorrectlyPublished {
  tiktok_account_id: string;
  username: string;
  account_owner_id: string;
  incorrectly_published_count: number;
}

export function IncorrectlyPublishedWidget() {
  const { isOwner } = useAuth();
  const queryClient = useQueryClient();
  const [isRestoring, setIsRestoring] = useState(false);

  // Query for incorrectly published videos
  const { data: incorrectlyPublished, isLoading, refetch } = useQuery({
    queryKey: ['incorrectly-published-videos'],
    queryFn: async () => {
      // Try RPC first
      try {
        const { data, error } = await supabase.rpc('get_incorrectly_published_videos' as any);
        if (!error && data) {
          return data as unknown as IncorrectlyPublished[];
        }
      } catch {
        // RPC doesn't exist, use direct query
      }

      // Direct query fallback
      // Find videos where is_published=true but published_at is null
      // and no publish_queue entry with status='published'
      const { data: videos, error } = await supabase
        .from('scraped_videos')
        .select(`
          id,
          tiktok_account_id,
          tiktok_accounts!inner(user_id, username)
        `)
        .eq('is_published', true)
        .is('published_at', null)
        .limit(1000);

      if (error) {
        console.error('Error fetching incorrectly published videos:', error);
        return [];
      }

      // For each video, check if there's a successful publish_queue entry
      const videoIds = videos?.map(v => v.id) || [];
      
      if (videoIds.length === 0) return [];

      const { data: publishedQueueItems } = await supabase
        .from('publish_queue')
        .select('scraped_video_id')
        .in('scraped_video_id', videoIds)
        .eq('status', 'published');

      const publishedVideoIds = new Set(publishedQueueItems?.map(p => p.scraped_video_id) || []);

      // Filter out videos that have successful publish entries
      const incorrectVideos = videos?.filter(v => !publishedVideoIds.has(v.id)) || [];

      // Group by tiktok account
      const mismatchMap = new Map<string, IncorrectlyPublished>();
      
      for (const video of incorrectVideos) {
        const account = video.tiktok_accounts as any;
        const existing = mismatchMap.get(video.tiktok_account_id);
        if (existing) {
          existing.incorrectly_published_count++;
        } else {
          mismatchMap.set(video.tiktok_account_id, {
            tiktok_account_id: video.tiktok_account_id,
            username: account?.username || 'Unknown',
            account_owner_id: account?.user_id || '',
            incorrectly_published_count: 1,
          });
        }
      }

      return Array.from(mismatchMap.values());
    },
    enabled: isOwner,
    staleTime: 60000,
  });

  // Mutation to restore videos
  const restoreMutation = useMutation({
    mutationFn: async () => {
      // Try RPC first
      try {
        const { data, error } = await supabase.rpc('restore_incorrectly_published_videos' as any);
        if (!error) {
          return data as unknown as number;
        }
      } catch {
        // RPC doesn't exist
      }

      // Manual restore: This requires the RPC for bulk update
      throw new Error('Please add the restore_incorrectly_published_videos RPC function to your database');
    },
    onSuccess: (restoredCount) => {
      toast.success(`Restored ${restoredCount} videos to available state`);
      queryClient.invalidateQueries({ queryKey: ['incorrectly-published-videos'] });
      queryClient.invalidateQueries({ queryKey: ['scraped-videos'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-analytics'] });
    },
    onError: (error) => {
      console.error('Error restoring videos:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to restore videos');
    },
  });

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      await restoreMutation.mutateAsync();
    } finally {
      setIsRestoring(false);
    }
  };

  // Don't render if not owner or no incorrectly published videos
  if (!isOwner || isLoading || !incorrectlyPublished || incorrectlyPublished.length === 0) {
    return null;
  }

  const totalIncorrect = incorrectlyPublished.reduce(
    (sum, m) => sum + (m.incorrectly_published_count || 0),
    0
  );

  return (
    <Alert className="border-warning/50 bg-warning/10">
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertTitle className="flex items-center gap-2 text-warning">
        Videos Incorrectly Marked as Published
      </AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-3">
          <p className="text-sm">
            <strong>{totalIncorrect}</strong> videos across{' '}
            <strong>{incorrectlyPublished.length}</strong> accounts were marked as published 
            but never actually uploaded (likely due to expired download URLs).
          </p>
          
          <div className="flex flex-wrap gap-2 text-xs">
            {incorrectlyPublished.slice(0, 5).map((m) => (
              <span
                key={m.tiktok_account_id}
                className="px-2 py-1 rounded-full bg-warning/20 text-warning-foreground"
              >
                @{m.username}: {m.incorrectly_published_count} videos
              </span>
            ))}
            {incorrectlyPublished.length > 5 && (
              <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                +{incorrectlyPublished.length - 5} more accounts
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRestore}
              disabled={isRestoring}
              className="border-warning/50 hover:bg-warning/10"
            >
              {isRestoring ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <Undo2 className="h-3 w-3 mr-1" />
                  Restore All Videos
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => refetch()}
              disabled={isRestoring}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
