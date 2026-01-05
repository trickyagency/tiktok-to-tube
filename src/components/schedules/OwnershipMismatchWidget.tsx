import { useState } from 'react';
import { AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface OwnershipMismatch {
  tiktok_account_id: string;
  username: string;
  account_owner_id: string;
  mismatched_video_count: number;
}

export function OwnershipMismatchWidget() {
  const { isOwner } = useAuth();
  const queryClient = useQueryClient();
  const [isFixing, setIsFixing] = useState(false);

  // Query for ownership mismatches using direct query (RPC fallback)
  const { data: mismatches, isLoading, refetch } = useQuery({
    queryKey: ['ownership-mismatches'],
    queryFn: async () => {
      // Try RPC first, fall back to direct query if RPC doesn't exist
      try {
        const { data, error } = await supabase.rpc('get_ownership_mismatches' as any);
        if (!error && data) {
          return data as unknown as OwnershipMismatch[];
        }
      } catch {
        // RPC doesn't exist, use direct query
      }

      // Direct query fallback - only works for owners due to RLS
      // This queries videos where user_id doesn't match their tiktok account's user_id
      const { data: videos, error } = await supabase
        .from('scraped_videos')
        .select(`
          id,
          user_id,
          tiktok_account_id,
          tiktok_accounts!inner(user_id, username)
        `)
        .limit(1000);

      if (error) {
        console.error('Error fetching videos for mismatch check:', error);
        return [];
      }

      // Group by tiktok account and count mismatches
      const mismatchMap = new Map<string, OwnershipMismatch>();
      
      for (const video of videos || []) {
        const account = video.tiktok_accounts as any;
        if (video.user_id !== account?.user_id) {
          const existing = mismatchMap.get(video.tiktok_account_id);
          if (existing) {
            existing.mismatched_video_count++;
          } else {
            mismatchMap.set(video.tiktok_account_id, {
              tiktok_account_id: video.tiktok_account_id,
              username: account?.username || 'Unknown',
              account_owner_id: account?.user_id || '',
              mismatched_video_count: 1,
            });
          }
        }
      }

      return Array.from(mismatchMap.values());
    },
    enabled: isOwner,
    staleTime: 60000, // 1 minute
  });

  // Mutation to fix mismatches
  const fixMutation = useMutation({
    mutationFn: async () => {
      // Try RPC first
      try {
        const { data, error } = await supabase.rpc('fix_ownership_mismatches' as any);
        if (!error) {
          return data as unknown as number;
        }
      } catch {
        // RPC doesn't exist
      }

      // Manual fix: Update each mismatched video
      // This requires the user to have the RPC function for bulk update
      // For now, show a message to add the RPC
      throw new Error('Please add the fix_ownership_mismatches RPC function to your database');
    },
    onSuccess: (fixedCount) => {
      toast.success(`Fixed ${fixedCount} video ownership records`);
      queryClient.invalidateQueries({ queryKey: ['ownership-mismatches'] });
      queryClient.invalidateQueries({ queryKey: ['scraped-videos'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: (error) => {
      console.error('Error fixing ownership mismatches:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fix ownership mismatches');
    },
  });

  const handleFix = async () => {
    setIsFixing(true);
    try {
      await fixMutation.mutateAsync();
    } finally {
      setIsFixing(false);
    }
  };

  // Don't render if not owner or no mismatches
  if (!isOwner || isLoading || !mismatches || mismatches.length === 0) {
    return null;
  }

  const totalMismatchedVideos = mismatches.reduce(
    (sum, m) => sum + (m.mismatched_video_count || 0),
    0
  );

  return (
    <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        Video Ownership Mismatches Detected
      </AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-3">
          <p className="text-sm">
            <strong>{totalMismatchedVideos}</strong> videos across{' '}
            <strong>{mismatches.length}</strong> accounts have incorrect ownership.
            These videos won't appear in scheduled uploads until fixed.
          </p>
          
          <div className="flex flex-wrap gap-2 text-xs">
            {mismatches.slice(0, 5).map((m) => (
              <span
                key={m.tiktok_account_id}
                className="px-2 py-1 rounded-full bg-destructive/20 text-destructive-foreground"
              >
                @{m.username}: {m.mismatched_video_count} videos
              </span>
            ))}
            {mismatches.length > 5 && (
              <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                +{mismatches.length - 5} more accounts
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleFix}
              disabled={isFixing}
            >
              {isFixing ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Fixing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Fix All Ownership
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => refetch()}
              disabled={isFixing}
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