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
import { Plus, X, Clock, FlaskConical } from 'lucide-react';
import { useYouTubeChannels } from '@/hooks/useYouTubeChannels';
import { useABTests } from '@/hooks/useABTests';

export function CreateABTestDialog() {
  const [open, setOpen] = useState(false);
  const [testName, setTestName] = useState('');
  const [youtubeChannelId, setYoutubeChannelId] = useState('');
  const [variantATimes, setVariantATimes] = useState<string[]>(['10:00']);
  const [variantBTimes, setVariantBTimes] = useState<string[]>(['19:00']);

  const { channels } = useYouTubeChannels();
  const { createTest, isCreating } = useABTests();

  const connectedChannels = channels.filter(c => c.auth_status === 'connected');

  const addTimeSlot = (variant: 'a' | 'b') => {
    if (variant === 'a' && variantATimes.length < 5) {
      setVariantATimes([...variantATimes, '12:00']);
    } else if (variant === 'b' && variantBTimes.length < 5) {
      setVariantBTimes([...variantBTimes, '21:00']);
    }
  };

  const removeTimeSlot = (variant: 'a' | 'b', index: number) => {
    if (variant === 'a' && variantATimes.length > 1) {
      setVariantATimes(variantATimes.filter((_, i) => i !== index));
    } else if (variant === 'b' && variantBTimes.length > 1) {
      setVariantBTimes(variantBTimes.filter((_, i) => i !== index));
    }
  };

  const updateTimeSlot = (variant: 'a' | 'b', index: number, value: string) => {
    if (variant === 'a') {
      const updated = [...variantATimes];
      updated[index] = value;
      setVariantATimes(updated);
    } else {
      const updated = [...variantBTimes];
      updated[index] = value;
      setVariantBTimes(updated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!testName || !youtubeChannelId) return;

    createTest({
      youtube_channel_id: youtubeChannelId,
      test_name: testName,
      variant_a_times: variantATimes,
      variant_b_times: variantBTimes,
    }, {
      onSuccess: () => {
        setOpen(false);
        resetForm();
      }
    });
  };

  const resetForm = () => {
    setTestName('');
    setYoutubeChannelId('');
    setVariantATimes(['10:00']);
    setVariantBTimes(['19:00']);
  };

  const renderTimeSlots = (variant: 'a' | 'b', times: string[]) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          Variant {variant.toUpperCase()} Times
        </Label>
        {times.length < 5 && (
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={() => addTimeSlot(variant)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {times.map((time, index) => (
          <div key={index} className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Input
              type="time"
              value={time}
              onChange={(e) => updateTimeSlot(variant, index, e.target.value)}
              className="w-28"
            />
            {times.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeTimeSlot(variant, index)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FlaskConical className="h-4 w-4 mr-2" />
          New A/B Test
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Create A/B Test
          </DialogTitle>
          <DialogDescription>
            Compare different posting times to find what works best
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Test Name */}
          <div className="space-y-2">
            <Label htmlFor="test-name">Test Name</Label>
            <Input
              id="test-name"
              placeholder="e.g., Morning vs Evening"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              required
            />
          </div>

          {/* YouTube Channel Selection */}
          <div className="space-y-2">
            <Label>YouTube Channel</Label>
            <Select value={youtubeChannelId} onValueChange={setYoutubeChannelId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select YouTube channel" />
              </SelectTrigger>
              <SelectContent>
                {connectedChannels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    {channel.channel_title || 'Unnamed Channel'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {connectedChannels.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No connected YouTube channels available.
              </p>
            )}
          </div>

          {/* Time Variants */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            {renderTimeSlots('a', variantATimes)}
            <div className="border-l pl-4">
              {renderTimeSlots('b', variantBTimes)}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Uploads will alternate between variants. Results show after 20+ uploads per variant.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isCreating || !testName || !youtubeChannelId}
            >
              {isCreating ? 'Creating...' : 'Start Test'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
