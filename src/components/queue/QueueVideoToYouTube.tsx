import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, Loader2, Youtube, AlertTriangle, Clock } from 'lucide-react';
import { useYouTubeChannels, YouTubeChannel } from '@/hooks/useYouTubeChannels';
import { usePublishQueue } from '@/hooks/usePublishQueue';
import { ScrapedVideo } from '@/hooks/useScrapedVideos';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

interface QueueVideoToYouTubeProps {
  video: ScrapedVideo;
  onSuccess?: () => void;
}

export function QueueVideoToYouTube({ video, onSuccess }: QueueVideoToYouTubeProps) {
  const [open, setOpen] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [scheduleOption, setScheduleOption] = useState<'now' | 'later'>('now');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { channels } = useYouTubeChannels();
  const { addToQueue } = usePublishQueue();

  const connectedChannels = channels.filter(c => c.auth_status === 'connected');

  const isTokenExpired = (channel: YouTubeChannel) => {
    if (!channel.token_expires_at) return false;
    return new Date(channel.token_expires_at) < new Date();
  };

  const handleSubmit = async () => {
    if (!selectedChannelId) {
      toast.error('Please select a YouTube channel');
      return;
    }

    const scheduledFor = scheduleOption === 'now' 
      ? new Date().toISOString()
      : new Date(scheduledTime).toISOString();

    setIsSubmitting(true);
    try {
      await addToQueue({
        scraped_video_id: video.id,
        youtube_channel_id: selectedChannelId,
        scheduled_for: scheduledFor,
      });
      
      toast.success(scheduleOption === 'now' 
        ? 'Video queued for immediate upload!' 
        : 'Video scheduled for upload!'
      );
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(`Failed to queue video: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set default scheduled time to 1 hour from now
  const getDefaultScheduledTime = () => {
    const date = new Date();
    date.setHours(date.getHours() + 1);
    return date.toISOString().slice(0, 16);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen && !scheduledTime) {
        setScheduledTime(getDefaultScheduledTime());
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2">
          <Upload className="h-3.5 w-3.5 mr-1" />
          Queue
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-500" />
            Queue for YouTube
          </DialogTitle>
          <DialogDescription>
            Add this video to the upload queue for YouTube.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Video Preview */}
          <div className="rounded-lg border p-3 bg-muted/30">
            <div className="flex gap-3">
              {video.thumbnail_url && (
                <img 
                  src={video.thumbnail_url} 
                  alt="Thumbnail" 
                  className="w-20 h-12 object-cover rounded"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {video.title || 'Untitled Video'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {video.duration}s • {video.view_count.toLocaleString()} views
                </p>
              </div>
            </div>
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
                            Expired
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Schedule Option */}
          <div className="space-y-2">
            <Label>When to Upload</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={scheduleOption === 'now' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setScheduleOption('now')}
              >
                <Upload className="h-4 w-4 mr-1" />
                Now
              </Button>
              <Button
                type="button"
                variant={scheduleOption === 'later' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setScheduleOption('later')}
              >
                <Clock className="h-4 w-4 mr-1" />
                Schedule
              </Button>
            </div>
          </div>

          {scheduleOption === 'later' && (
            <div className="space-y-2">
              <Label>Schedule Time</Label>
              <Input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedChannelId || isSubmitting || connectedChannels.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Queueing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Add to Queue
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
