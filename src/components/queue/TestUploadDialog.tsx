import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Beaker, Loader2, Youtube, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useYouTubeChannels, YouTubeChannel } from '@/hooks/useYouTubeChannels';
import { useAllScrapedVideos } from '@/hooks/useScrapedVideos';
import { usePublishQueue } from '@/hooks/usePublishQueue';
import { UploadProgressBar } from './UploadProgressBar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TestUploadDialogProps {
  onSuccess?: () => void;
}

type UploadState = 'idle' | 'queuing' | 'processing' | 'success' | 'failed';

export function TestUploadDialog({ onSuccess }: TestUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [queueItemId, setQueueItemId] = useState<string | null>(null);
  const [progressPhase, setProgressPhase] = useState<string | null>(null);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null);

  const { channels } = useYouTubeChannels();
  const { data: videos = [], isLoading: videosLoading } = useAllScrapedVideos();
  const { addToQueue } = usePublishQueue();

  const connectedChannels = channels.filter(c => c.auth_status === 'connected');
  const availableVideos = videos.filter(v => !v.is_published && v.download_url);

  const selectedVideo = availableVideos.find(v => v.id === selectedVideoId);
  const selectedChannel = connectedChannels.find(c => c.id === selectedChannelId);

  // Subscribe to queue item updates for real-time progress
  useEffect(() => {
    if (!queueItemId) return;

    const channel = supabase
      .channel(`queue-item-${queueItemId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'publish_queue',
          filter: `id=eq.${queueItemId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          
          // Update progress
          if (updated.progress_phase) {
            setProgressPhase(updated.progress_phase);
          }
          if (typeof updated.progress_percentage === 'number') {
            setProgressPercentage(updated.progress_percentage);
          }
          
          // Handle status changes
          if (updated.status === 'published') {
            setUploadState('success');
            setYoutubeUrl(updated.youtube_video_url);
            setProgressPercentage(100);
            toast.success('Video uploaded successfully!');
            onSuccess?.();
          } else if (updated.status === 'failed') {
            setUploadState('failed');
            setErrorMessage(updated.error_message || 'Upload failed');
            toast.error(`Upload failed: ${updated.error_message || 'Unknown error'}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queueItemId, onSuccess]);

  const handleSubmit = async () => {
    if (!selectedVideoId || !selectedChannelId) {
      toast.error('Please select both a video and a channel');
      return;
    }

    setUploadState('queuing');
    setErrorMessage(null);
    setYoutubeUrl(null);
    setProgressPhase(null);
    setProgressPercentage(0);

    try {
      // Add to queue
      const queueItem = await addToQueue({
        scraped_video_id: selectedVideoId,
        youtube_channel_id: selectedChannelId,
        scheduled_for: new Date().toISOString(),
      });

      if (queueItem?.id) {
        setQueueItemId(queueItem.id);
      }

      setUploadState('processing');
      setProgressPhase('downloading');
      setProgressPercentage(5);
      
      toast.info('Starting upload...', { duration: 2000 });

      // Immediately trigger process-queue
      const { error } = await supabase.functions.invoke('process-queue');
      
      if (error) {
        console.error('Failed to trigger process-queue:', error);
        // Don't fail here - the cron job will pick it up
      }
    } catch (error: any) {
      setUploadState('failed');
      setErrorMessage(error.message);
      toast.error(`Failed to queue video: ${error.message}`);
    }
  };

  const handleClose = () => {
    if (uploadState === 'processing') {
      // Don't close during processing, but allow it
      const confirmed = window.confirm('Upload is in progress. The upload will continue in the background. Close anyway?');
      if (!confirmed) return;
    }
    
    setOpen(false);
    // Reset state after a delay to allow animation
    setTimeout(() => {
      setUploadState('idle');
      setSelectedVideoId('');
      setSelectedChannelId('');
      setQueueItemId(null);
      setProgressPhase(null);
      setProgressPercentage(0);
      setErrorMessage(null);
      setYoutubeUrl(null);
    }, 200);
  };

  const handleReset = () => {
    setUploadState('idle');
    setSelectedVideoId('');
    setSelectedChannelId('');
    setQueueItemId(null);
    setProgressPhase(null);
    setProgressPercentage(0);
    setErrorMessage(null);
    setYoutubeUrl(null);
  };

  const isTokenExpired = (channel: YouTubeChannel) => {
    if (!channel.token_expires_at) return false;
    return new Date(channel.token_expires_at) < new Date();
  };

  const isProcessing = uploadState === 'queuing' || uploadState === 'processing';

  return (
    <Dialog open={open} onOpenChange={(o) => o ? setOpen(true) : handleClose()}>
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

        {/* Success State */}
        {uploadState === 'success' && (
          <div className="py-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Upload Successful!</h3>
                <p className="text-sm text-muted-foreground">
                  Your video is now live on YouTube
                </p>
              </div>
            </div>
            
            {youtubeUrl && (
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <Youtube className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium">View on YouTube</span>
              </a>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleReset}>
                Upload Another
              </Button>
              <Button className="flex-1" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}

        {/* Failed State */}
        {uploadState === 'failed' && (
          <div className="py-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Upload Failed</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {errorMessage || 'An unknown error occurred'}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleReset}>
                Try Again
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        )}

        {/* Processing State */}
        {uploadState === 'processing' && (
          <div className="py-6 space-y-4">
            <div className="flex flex-col items-center text-center gap-3 mb-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div>
                <h3 className="font-medium">Uploading to YouTube...</h3>
                <p className="text-sm text-muted-foreground">
                  Please wait while we upload your video
                </p>
              </div>
            </div>

            {/* Video info */}
            {selectedVideo && (
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="flex gap-3">
                  {selectedVideo.thumbnail_url && (
                    <img 
                      src={selectedVideo.thumbnail_url} 
                      alt="Thumbnail" 
                      className="w-16 h-10 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {selectedVideo.title || 'Untitled'}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Youtube className="h-3 w-3" />
                      {selectedChannel?.channel_title}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <UploadProgressBar
              phase={progressPhase}
              percentage={progressPercentage}
            />

            <p className="text-xs text-center text-muted-foreground">
              You can close this dialog - upload will continue in the background
            </p>
          </div>
        )}

        {/* Idle State - Selection Form */}
        {(uploadState === 'idle' || uploadState === 'queuing') && (
          <>
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
                  <Select 
                    value={selectedVideoId} 
                    onValueChange={setSelectedVideoId}
                    disabled={isProcessing}
                  >
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
                  <Select 
                    value={selectedChannelId} 
                    onValueChange={setSelectedChannelId}
                    disabled={isProcessing}
                  >
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
              <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!selectedVideoId || !selectedChannelId || isProcessing}
              >
                {uploadState === 'queuing' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Queueing...
                  </>
                ) : (
                  <>
                    <Youtube className="h-4 w-4 mr-2" />
                    Upload Now
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
