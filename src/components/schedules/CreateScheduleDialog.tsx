import { useState } from 'react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X, Clock, Crown, AlertCircle } from 'lucide-react';
import { useTikTokAccounts } from '@/hooks/useTikTokAccounts';
import { useYouTubeChannels } from '@/hooks/useYouTubeChannels';
import { usePublishSchedules } from '@/hooks/usePublishSchedules';
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

interface CreateScheduleDialogProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function CreateScheduleDialog({ onSuccess, trigger }: CreateScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [scheduleName, setScheduleName] = useState('');
  const [tiktokAccountId, setTiktokAccountId] = useState('');
  const [youtubeChannelId, setYoutubeChannelId] = useState('');
  const [publishTimes, setPublishTimes] = useState<string[]>(['10:00']);
  const [timezone, setTimezone] = useState('America/New_York');

  const { data: tikTokAccounts = [] } = useTikTokAccounts();
  const { channels: youtubeChannels } = useYouTubeChannels();
  const { createSchedule, isCreating, schedules: existingSchedules } = usePublishSchedules();
  const { data: subscription } = useCurrentUserSubscription();

  // Get max videos per day from subscription plan (default to 2 for basic)
  const maxVideosPerDay = subscription?.plan?.max_videos_per_day || 2;

  // Only show connected YouTube channels
  const connectedChannels = youtubeChannels.filter(c => c.auth_status === 'connected');

  // Get channels that already have ANY schedule (active or paused)
  const channelsWithSchedule = existingSchedules.map(s => ({
    channelId: s.youtube_channel_id,
    isActive: s.is_active
  }));

  // Available channels are those without ANY schedule
  const availableChannels = connectedChannels.filter(
    c => !channelsWithSchedule.some(s => s.channelId === c.id)
  );

  const canAddMoreTimes = publishTimes.length < maxVideosPerDay;

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
    
    if (!tiktokAccountId || !youtubeChannelId || !scheduleName) {
      return;
    }

    await createSchedule({
      tiktok_account_id: tiktokAccountId,
      youtube_channel_id: youtubeChannelId,
      schedule_name: scheduleName,
      videos_per_day: publishTimes.length,
      publish_times: publishTimes,
      timezone,
    });

    setOpen(false);
    resetForm();
    onSuccess?.();
  };

  const resetForm = () => {
    setScheduleName('');
    setTiktokAccountId('');
    setYoutubeChannelId('');
    setPublishTimes(['10:00']);
    setTimezone('America/New_York');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Schedule
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Upload Schedule</DialogTitle>
          <DialogDescription>
            Set up automatic video uploads from TikTok to YouTube
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Schedule Name */}
          <div className="space-y-2">
            <Label htmlFor="schedule-name">Schedule Name</Label>
            <Input
              id="schedule-name"
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
            {tikTokAccounts.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No TikTok accounts added yet
              </p>
            )}
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
                  .filter(c => channelsWithSchedule.some(s => s.channelId === c.id))
                  .map((channel) => {
                    const schedule = channelsWithSchedule.find(s => s.channelId === channel.id);
                    const status = schedule?.isActive ? 'Active' : 'Paused';
                    return (
                      <SelectItem key={channel.id} value={channel.id} disabled>
                        {channel.channel_title || 'Unnamed Channel'} ({status} schedule exists)
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
            {connectedChannels.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No connected YouTube channels. Please authorize a channel first.
              </p>
            )}
            {connectedChannels.length > 0 && availableChannels.length === 0 && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                All channels have schedules. Activate or edit an existing schedule instead.
              </p>
            )}
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isCreating || !tiktokAccountId || !youtubeChannelId || !scheduleName}
            >
              {isCreating ? 'Creating...' : 'Create Schedule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
