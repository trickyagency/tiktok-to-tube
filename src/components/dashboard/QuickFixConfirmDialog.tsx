import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, ArrowRight, CheckCircle, Loader2, Music2, Youtube, XCircle } from 'lucide-react';
import { QueueItemWithDetails } from '@/hooks/usePublishQueue';

interface YouTubeChannel {
  id: string;
  channel_title: string | null;
  channel_thumbnail: string | null;
  tiktok_account_id: string | null;
}

interface QuickFixConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  mismatchedItems: QueueItemWithDetails[];
  youtubeChannels: YouTubeChannel[];
}

export function QuickFixConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  mismatchedItems,
  youtubeChannels,
}: QuickFixConfirmDialogProps) {
  // Calculate which items can be fixed vs. which have no matching channel
  const itemsWithFix = mismatchedItems.map(item => {
    const correctChannel = youtubeChannels.find(
      ch => ch.tiktok_account_id === item.scraped_video?.tiktok_account_id
    );
    return { item, correctChannel };
  });

  const fixableItems = itemsWithFix.filter(({ correctChannel }) => !!correctChannel);
  const unfixableItems = itemsWithFix.filter(({ correctChannel }) => !correctChannel);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Fix Account Mismatches
          </DialogTitle>
          <DialogDescription>
            {fixableItems.length > 0
              ? `${fixableItems.length} video${fixableItems.length > 1 ? 's' : ''} will be reassigned to the correct YouTube channel based on their TikTok source.`
              : 'No videos can be fixed automatically.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[300px] pr-4">
          <div className="space-y-3">
            {itemsWithFix.map(({ item, correctChannel }) => (
              <div
                key={item.id}
                className="flex gap-3 p-3 rounded-lg border bg-card"
              >
                {/* Thumbnail */}
                <div className="w-16 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                  {item.scraped_video?.thumbnail_url ? (
                    <img
                      src={item.scraped_video.thumbnail_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Youtube className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.scraped_video?.title || 'Untitled Video'}
                  </p>

                  {/* Current assignment (wrong) */}
                  <div className="flex items-center gap-1.5 mt-1 text-xs">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={item.scraped_video?.tiktok_account?.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px] bg-gradient-to-br from-pink-500 to-purple-600 text-white">
                        <Music2 className="h-2.5 w-2.5" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-muted-foreground truncate">
                      @{item.scraped_video?.tiktok_account?.username || 'unknown'}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
                    <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10 gap-1">
                      <XCircle className="h-3 w-3" />
                      <span className="truncate max-w-[80px]">
                        {item.youtube_channel?.channel_title || 'Unknown'}
                      </span>
                    </Badge>
                  </div>

                  {/* Target assignment (correct) */}
                  {correctChannel ? (
                    <div className="flex items-center gap-1.5 mt-1 text-xs">
                      <span className="text-muted-foreground">Will move to:</span>
                      <Badge variant="outline" className="text-green-600 border-green-500/30 bg-green-500/10 gap-1">
                        <CheckCircle className="h-3 w-3" />
                        <span className="truncate max-w-[120px]">
                          {correctChannel.channel_title || 'Channel'}
                        </span>
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                      <AlertTriangle className="h-3 w-3" />
                      <span>No matching channel found</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {unfixableItems.length > 0 && fixableItems.length > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>
              {unfixableItems.length} video{unfixableItems.length > 1 ? 's have' : ' has'} no matching YouTube channel and will be skipped.
            </span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading || fixableItems.length === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Fixing...
              </>
            ) : (
              `Fix ${fixableItems.length} Video${fixableItems.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
