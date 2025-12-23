import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Beaker, Loader2, Youtube, AlertTriangle } from 'lucide-react';
import { useYouTubeChannels, YouTubeChannel } from '@/hooks/useYouTubeChannels';
import { useAllScrapedVideos, ScrapedVideo } from '@/hooks/useScrapedVideos';
import { usePublishQueue } from '@/hooks/usePublishQueue';
import { toast } from 'sonner';

interface TestUploadDialogProps {
  onSuccess?: () => void;
}

export function TestUploadDialog({ onSuccess }: TestUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { channels } = useYouTubeChannels();
  const { data: videos = [], isLoading: videosLoading } = useAllScrapedVideos();
  const { addToQueue } = usePublishQueue();

  const connectedChannels = channels.filter(c => c.auth_status === 'connected');
  const availableVideos = videos.filter(v => !v.is_published && v.download_url);

  const selectedVideo = availableVideos.find(v => v.id === selectedVideoId);
  const selectedChannel = connectedChannels.find(c => c.id === selectedChannelId);

  const handleSubmit = async () => {
    if (!selectedVideoId || !selectedChannelId) {
      toast.error('Please select both a video and a channel');
      return;
    }

    setIsSubmitting(true);
    try {
      await addToQueue({
        scraped_video_id: selectedVideoId,
        youtube_channel_id: selectedChannelId,
        scheduled_for: new Date().toISOString(),
      });
      
      toast.success('Video added to queue! It will upload shortly.');
      setOpen(false);
      setSelectedVideoId('');
      setSelectedChannelId('');
      onSuccess?.();
    } catch (error: any) {
      toast.error(`Failed to queue video: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isTokenExpired = (channel: YouTubeChannel) => {
    if (!channel.token_expires_at) return false;
    return new Date(channel.token_expires_at) < new Date();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Beaker className="h-4 w-4 mr-2" />
          Test Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Beaker className="h-5 w-5" />
            Test YouTube Upload
          </DialogTitle>
          <DialogDescription>
            Queue a video for immediate upload to test the YouTube integration.
            Video will be uploaded as <Badge variant="secondary">unlisted</Badge> by default.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Video Selection */}
          <div className="space-y-2">
            <Label>Select Video</Label>
            {videosLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading videos...
              </div>
            ) : availableVideos.length === 0 ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                No videos available. Scrape some TikTok videos first.
              </div>
            ) : (
              <Select value={selectedVideoId} onValueChange={setSelectedVideoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a video to upload" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {availableVideos.slice(0, 50).map((video) => (
                    <SelectItem key={video.id} value={video.id}>
                      <div className="flex flex-col">
                        <span className="truncate max-w-[280px]">
                          {video.title || video.tiktok_video_id}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {video.view_count.toLocaleString()} views • {video.duration}s
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Channel Selection */}
          <div className="space-y-2">
            <Label>YouTube Channel</Label>
            {connectedChannels.length === 0 ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                No connected channels. Connect a YouTube channel first.
              </div>
            ) : (
              <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a channel" />
                </SelectTrigger>
                <SelectContent>
                  {connectedChannels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      <div className="flex items-center gap-2">
                        <Youtube className="h-4 w-4 text-red-500" />
                        <span>{channel.channel_title}</span>
                        {isTokenExpired(channel) && (
                          <Badge variant="destructive" className="text-xs">
                            Token Expired
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Selected Video Preview */}
          {selectedVideo && (
            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="flex gap-3">
                {selectedVideo.thumbnail_url && (
                  <img 
                    src={selectedVideo.thumbnail_url} 
                    alt="Thumbnail" 
                    className="w-20 h-12 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {selectedVideo.title || 'Untitled'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Duration: {selectedVideo.duration}s • {selectedVideo.view_count.toLocaleString()} views
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Warning for expired token */}
          {selectedChannel && isTokenExpired(selectedChannel) && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-600">
              <AlertTriangle className="h-4 w-4 inline mr-2" />
              Token expired for this channel. Please refresh the token first.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedVideoId || !selectedChannelId || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Queueing...
              </>
            ) : (
              <>
                <Youtube className="h-4 w-4 mr-2" />
                Queue for Upload
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
