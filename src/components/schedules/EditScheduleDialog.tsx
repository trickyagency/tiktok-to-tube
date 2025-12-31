import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X, Clock, Crown } from 'lucide-react';
import { useTikTokAccounts } from '@/hooks/useTikTokAccounts';
import { useYouTubeChannels } from '@/hooks/useYouTubeChannels';
import { usePublishSchedules, PublishSchedule } from '@/hooks/usePublishSchedules';
import { useCurrentUserSubscription } from '@/hooks/useUserSubscription';
import { Link } from 'react-router-dom';

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Karachi', label: 'Pakistan (PKT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'UTC', label: 'UTC' },
];

interface EditScheduleDialogProps {
  schedule: PublishSchedule | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditScheduleDialog({ schedule, isOpen, onClose, onSuccess }: EditScheduleDialogProps) {
  const [scheduleName, setScheduleName] = useState('');
  const [tiktokAccountId, setTiktokAccountId] = useState('');
  const [youtubeChannelId, setYoutubeChannelId] = useState('');
  const [publishTimes, setPublishTimes] = useState<string[]>(['10:00']);
  const [timezone, setTimezone] = useState('America/New_York');
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: tikTokAccounts = [] } = useTikTokAccounts();
  const { channels: youtubeChannels } = useYouTubeChannels();
  const { updateSchedule, schedules: existingSchedules } = usePublishSchedules();
  const { data: subscription } = useCurrentUserSubscription();

  // Get max videos per day from subscription plan (default to 2 for basic)
  const maxVideosPerDay = subscription?.plan?.max_videos_per_day || 2;

  // Only show connected YouTube channels
  const connectedChannels = youtubeChannels.filter(c => c.auth_status === 'connected');

  // Get channels that already have an active schedule (excluding current schedule being edited)
  const channelsWithActiveSchedule = existingSchedules
    .filter(s => s.is_active && s.id !== schedule?.id)
    .map(s => s.youtube_channel_id);

  // Available channels are those without active schedules + current schedule's channel
  const availableChannels = connectedChannels.filter(
    c => !channelsWithActiveSchedule.includes(c.id)
  );

  const canAddMoreTimes = publishTimes.length < maxVideosPerDay;

  // Populate form when schedule changes
  useEffect(() => {
    if (schedule) {
      setScheduleName(schedule.schedule_name);
      setTiktokAccountId(schedule.tiktok_account_id);
      setYoutubeChannelId(schedule.youtube_channel_id);
      setPublishTimes(schedule.publish_times.length > 0 ? schedule.publish_times : ['10:00']);
      setTimezone(schedule.timezone);
    }
  }, [schedule]);

  const addTimeSlot = () => {
    if (canAddMoreTimes) {
      setPublishTimes([...publishTimes, '12:00']);
    }
  };

  const removeTimeSlot = (index: number) => {
    if (publishTimes.length > 1) {
      setPublishTimes(publishTimes.filter((_, i) => i !== index));
    }
  };

  const updateTimeSlot = (index: number, value: string) => {
    const updated = [...publishTimes];
    updated[index] = value;
    setPublishTimes(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!schedule || !tiktokAccountId || !youtubeChannelId || !scheduleName) {
      return;
    }

    setIsUpdating(true);
    try {
      await updateSchedule({
        id: schedule.id,
        tiktok_account_id: tiktokAccountId,
        youtube_channel_id: youtubeChannelId,
        schedule_name: scheduleName,
        videos_per_day: publishTimes.length,
        publish_times: publishTimes,
        timezone,
      });

      onClose();
      onSuccess?.();
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Schedule</DialogTitle>
          <DialogDescription>
            Update your upload schedule settings
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Schedule Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-schedule-name">Schedule Name</Label>
            <Input
              id="edit-schedule-name"
              placeholder="e.g., Daily Morning Uploads"
              value={scheduleName}
              onChange={(e) => setScheduleName(e.target.value)}
              required
            />
          </div>

          {/* TikTok Account Selection */}
          <div className="space-y-2">
            <Label>Source TikTok Account</Label>
            <Select value={tiktokAccountId} onValueChange={setTiktokAccountId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select TikTok account" />
              </SelectTrigger>
              <SelectContent>
                {tikTokAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    @{account.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* YouTube Channel Selection */}
          <div className="space-y-2">
            <Label>Target YouTube Channel</Label>
            <Select value={youtubeChannelId} onValueChange={setYoutubeChannelId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select YouTube channel" />
              </SelectTrigger>
              <SelectContent>
                {availableChannels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    {channel.channel_title || 'Unnamed Channel'}
                  </SelectItem>
                ))}
                {/* Show channels with existing schedules as disabled */}
                {connectedChannels
                  .filter(c => channelsWithActiveSchedule.includes(c.id))
                  .map((channel) => (
                    <SelectItem key={channel.id} value={channel.id} disabled>
                      {channel.channel_title || 'Unnamed Channel'} (Schedule exists)
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Publish Times */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Publish Times (one video per time)</Label>
              {canAddMoreTimes && (
                <Button type="button" variant="ghost" size="sm" onClick={addTimeSlot}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Time
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {publishTimes.length}/{maxVideosPerDay} time slots used
            </p>
            {!canAddMoreTimes && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                <Crown className="h-4 w-4 text-amber-500" />
                <p className="text-xs text-amber-600">
                  Your plan allows {maxVideosPerDay} videos/day.{' '}
                  <Link to="/dashboard/upgrade" className="underline font-medium hover:text-amber-700">
                    Upgrade for more
                  </Link>
                </p>
              </div>
            )}
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {publishTimes.map((time, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => updateTimeSlot(index, e.target.value)}
                    className="w-32"
                  />
                  {publishTimes.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTimeSlot(index)}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isUpdating || !tiktokAccountId || !youtubeChannelId || !scheduleName}
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
