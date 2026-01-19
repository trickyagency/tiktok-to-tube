import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, X, Clock, Crown, Layers, Youtube } from 'lucide-react';
import { useTikTokAccounts } from '@/hooks/useTikTokAccounts';
import { useYouTubeChannels } from '@/hooks/useYouTubeChannels';
import { usePublishSchedules, PublishSchedule } from '@/hooks/usePublishSchedules';
import { useCurrentUserSubscription } from '@/hooks/useUserSubscription';
import { useChannelPools } from '@/hooks/useChannelPools';
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
  const [channelPoolId, setChannelPoolId] = useState('');
  const [channelMode, setChannelMode] = useState<'single' | 'pool'>('single');
  const [publishTimes, setPublishTimes] = useState<string[]>(['10:00']);
  const [timezone, setTimezone] = useState('America/New_York');
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: tikTokAccounts = [] } = useTikTokAccounts();
  const { channels: youtubeChannels } = useYouTubeChannels();
  const { updateSchedule, schedules: existingSchedules } = usePublishSchedules();
  const { data: subscription } = useCurrentUserSubscription();
  const { pools } = useChannelPools();

  // Get max videos per day from subscription plan (default to 2 for basic)
  const maxVideosPerDay = subscription?.plan?.max_videos_per_day || 2;

  // Only show connected YouTube channels
  const connectedChannels = youtubeChannels.filter(c => c.auth_status === 'connected');

  // Filter to active pools with members
  const activePools = pools.filter(p => p.is_active && p.members && p.members.length > 0);

  // Get selected pool details
  const selectedPool = activePools.find(p => p.id === channelPoolId);

  // Get channels that already have ANY schedule (excluding current schedule being edited)
  const channelsWithSchedule = existingSchedules
    .filter(s => s.id !== schedule?.id)
    .map(s => ({
      channelId: s.youtube_channel_id,
      isActive: s.is_active
    }));

  // Available channels are those without ANY schedule + current schedule's channel
  const availableChannels = connectedChannels.filter(
    c => !channelsWithSchedule.some(s => s.channelId === c.id)
  );

  const canAddMoreTimes = publishTimes.length < maxVideosPerDay;

  // Populate form when schedule changes
  useEffect(() => {
    if (schedule) {
      setScheduleName(schedule.schedule_name);
      setTiktokAccountId(schedule.tiktok_account_id);
      setYoutubeChannelId(schedule.youtube_channel_id);
      setChannelPoolId(schedule.channel_pool_id || '');
      setChannelMode(schedule.channel_pool_id ? 'pool' : 'single');
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
    
    const effectiveYoutubeChannelId = channelMode === 'pool' && selectedPool?.members?.[0]
      ? selectedPool.members[0].youtube_channel_id
      : youtubeChannelId;
    
    if (!schedule || !tiktokAccountId || !effectiveYoutubeChannelId || !scheduleName) {
      return;
    }

    if (channelMode === 'pool' && !channelPoolId) {
      return;
    }

    setIsUpdating(true);
    try {
      await updateSchedule({
        id: schedule.id,
        tiktok_account_id: tiktokAccountId,
        youtube_channel_id: effectiveYoutubeChannelId,
        channel_pool_id: channelMode === 'pool' ? channelPoolId : null,
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

  const isFormValid = scheduleName && tiktokAccountId && (
    (channelMode === 'single' && youtubeChannelId) ||
    (channelMode === 'pool' && channelPoolId && selectedPool?.members?.length)
  );

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

          {/* YouTube Channel Selection with Pool Support */}
          <div className="space-y-2">
            <Label>Target YouTube Destination</Label>
            <Tabs value={channelMode} onValueChange={(v) => setChannelMode(v as 'single' | 'pool')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="single" className="gap-2">
                  <Youtube className="h-4 w-4" />
                  Single Channel
                </TabsTrigger>
                <TabsTrigger value="pool" className="gap-2" disabled={activePools.length === 0}>
                  <Layers className="h-4 w-4" />
                  Channel Pool
                  {activePools.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {activePools.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="single" className="mt-3">
                <Select value={youtubeChannelId} onValueChange={setYoutubeChannelId}>
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
                        const existingSchedule = channelsWithSchedule.find(s => s.channelId === channel.id);
                        const status = existingSchedule?.isActive ? 'Active' : 'Paused';
                        return (
                          <SelectItem key={channel.id} value={channel.id} disabled>
                            {channel.channel_title || 'Unnamed Channel'} ({status} schedule exists)
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </TabsContent>
              
              <TabsContent value="pool" className="mt-3">
                {activePools.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground border rounded-md border-dashed">
                    <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No channel pools available</p>
                    <p className="text-xs mt-1">Create a pool in YouTube Channels page</p>
                  </div>
                ) : (
                  <Select value={channelPoolId} onValueChange={setChannelPoolId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select channel pool" />
                    </SelectTrigger>
                    <SelectContent>
                      {activePools.map((pool) => (
                        <SelectItem key={pool.id} value={pool.id}>
                          <div className="flex items-center gap-2">
                            <span>{pool.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {pool.members?.length || 0} channels
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedPool && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Strategy: {selectedPool.rotation_strategy.replace('_', ' ')} • 
                    Channels: {selectedPool.members?.map(m => m.youtube_channel?.channel_title).join(', ')}
                  </p>
                )}
              </TabsContent>
            </Tabs>
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
              disabled={isUpdating || !isFormValid}
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
