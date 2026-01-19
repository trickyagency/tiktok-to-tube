import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Layers, 
  GripVertical, 
  X, 
  BarChart3, 
  RefreshCw, 
  ListOrdered,
  Youtube,
  Trash2
} from 'lucide-react';
import { useChannelPools, ChannelPool, RotationStrategy } from '@/hooks/useChannelPools';
import { useYouTubeChannels } from '@/hooks/useYouTubeChannels';
import { usePoolQuotaAggregation } from '@/hooks/usePoolQuotaAggregation';
import { cn } from '@/lib/utils';

const ROTATION_STRATEGIES = [
  { 
    value: 'quota_based' as RotationStrategy, 
    label: 'Quota Based', 
    description: 'Use channel with most remaining quota',
    icon: BarChart3
  },
  { 
    value: 'round_robin' as RotationStrategy, 
    label: 'Round Robin', 
    description: 'Distribute evenly across channels',
    icon: RefreshCw
  },
  { 
    value: 'priority' as RotationStrategy, 
    label: 'Priority Based', 
    description: 'Use primary first, fallback when exhausted',
    icon: ListOrdered
  },
];

interface ChannelPoolDialogProps {
  pool?: ChannelPool | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function ChannelPoolDialog({ 
  pool, 
  open: controlledOpen, 
  onOpenChange, 
  trigger, 
  onSuccess 
}: ChannelPoolDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [strategy, setStrategy] = useState<RotationStrategy>('quota_based');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { 
    pools,
    createPool, 
    updatePool, 
    addChannelToPool,
    removeChannelFromPool,
    reorderChannels,
    isCreating 
  } = useChannelPools();
  const { channels: youtubeChannels } = useYouTubeChannels();
  const { poolQuotas } = usePoolQuotaAggregation(pools);

  // Only show connected channels
  const connectedChannels = youtubeChannels.filter(c => c.auth_status === 'connected');

  // Get channels already in other pools
  const channelsInOtherPools = new Set(
    pools
      .filter(p => p.id !== pool?.id)
      .flatMap(p => p.members?.map(m => m.youtube_channel_id) || [])
  );

  // Available channels for this pool
  const availableChannels = connectedChannels.filter(
    c => !channelsInOtherPools.has(c.id)
  );

  // Populate form for editing
  useEffect(() => {
    if (pool) {
      setName(pool.name);
      setDescription(pool.description || '');
      setStrategy(pool.rotation_strategy);
      setSelectedChannels(pool.members?.map(m => m.youtube_channel_id) || []);
    } else {
      setName('');
      setDescription('');
      setStrategy('quota_based');
      setSelectedChannels([]);
    }
  }, [pool, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || selectedChannels.length === 0) return;

    setIsSubmitting(true);
    try {
      if (pool) {
        // Update existing pool
        await updatePool({
          id: pool.id,
          name: name.trim(),
          description: description.trim() || undefined,
          rotation_strategy: strategy,
        });

        // Handle member changes
        const existingMemberIds = pool.members?.map(m => m.youtube_channel_id) || [];
        const toAdd = selectedChannels.filter(id => !existingMemberIds.includes(id));
        const toRemove = pool.members?.filter(m => !selectedChannels.includes(m.youtube_channel_id)) || [];

        for (const channelId of toAdd) {
          await addChannelToPool({ poolId: pool.id, channelId, priority: selectedChannels.indexOf(channelId) });
        }
        for (const member of toRemove) {
          await removeChannelFromPool(member.id);
        }

        // Update order
        const memberIds = pool.members
          ?.filter(m => selectedChannels.includes(m.youtube_channel_id))
          .sort((a, b) => selectedChannels.indexOf(a.youtube_channel_id) - selectedChannels.indexOf(b.youtube_channel_id))
          .map(m => m.id) || [];
        
        if (memberIds.length > 0) {
          await reorderChannels({ poolId: pool.id, memberIds });
        }
      } else {
        // Create new pool
        const newPool = await createPool({
          name: name.trim(),
          description: description.trim() || undefined,
          rotation_strategy: strategy,
        });

        // Add channels
        for (let i = 0; i < selectedChannels.length; i++) {
          await addChannelToPool({ 
            poolId: newPool.id, 
            channelId: selectedChannels[i], 
            priority: i 
          });
        }
      }

      setOpen(false);
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleChannel = (channelId: string) => {
    setSelectedChannels(prev => 
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  const moveChannel = (fromIndex: number, toIndex: number) => {
    const updated = [...selectedChannels];
    const [removed] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, removed);
    setSelectedChannels(updated);
  };

  const isEditing = !!pool;
  const currentPoolQuota = pool ? poolQuotas.find(p => p.poolId === pool.id) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            {isEditing ? 'Edit Channel Pool' : 'Create Channel Pool'}
          </DialogTitle>
          <DialogDescription>
            Group multiple YouTube channels for automatic rotation when quota is exhausted
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 pb-4">
              {/* Pool Name */}
              <div className="space-y-2">
                <Label htmlFor="pool-name">Pool Name</Label>
                <Input
                  id="pool-name"
                  placeholder="e.g., Gaming Channels"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="pool-description">Description (optional)</Label>
                <Textarea
                  id="pool-description"
                  placeholder="Describe this pool..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Rotation Strategy */}
              <div className="space-y-3">
                <Label>Rotation Strategy</Label>
                <div className="grid gap-3">
                  {ROTATION_STRATEGIES.map((strat) => (
                    <Card
                      key={strat.value}
                      className={cn(
                        "p-3 cursor-pointer transition-all",
                        strategy === strat.value 
                          ? "border-primary bg-primary/5" 
                          : "hover:border-muted-foreground/30"
                      )}
                      onClick={() => setStrategy(strat.value)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center",
                          strategy === strat.value ? "bg-primary/10" : "bg-muted"
                        )}>
                          <strat.icon className={cn(
                            "h-5 w-5",
                            strategy === strat.value ? "text-primary" : "text-muted-foreground"
                          )} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{strat.label}</p>
                          <p className="text-xs text-muted-foreground">{strat.description}</p>
                        </div>
                        <div className={cn(
                          "h-4 w-4 rounded-full border-2",
                          strategy === strat.value 
                            ? "border-primary bg-primary" 
                            : "border-muted-foreground/30"
                        )} />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Channel Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Channels in Pool</Label>
                  <Badge variant="secondary">
                    {selectedChannels.length} selected
                  </Badge>
                </div>
                
                {availableChannels.length === 0 ? (
                  <Card className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      No available channels. All connected channels are already in other pools.
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {/* Selected channels (draggable order) */}
                    {selectedChannels.length > 0 && (
                      <div className="space-y-2 mb-4">
                        <p className="text-xs text-muted-foreground">
                          Drag to reorder priority (first = highest priority)
                        </p>
                        {selectedChannels.map((channelId, index) => {
                          const channel = connectedChannels.find(c => c.id === channelId);
                          if (!channel) return null;
                          
                          return (
                            <Card
                              key={channelId}
                              className="p-3 flex items-center gap-3 bg-primary/5 border-primary/20"
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                              <Badge variant="outline" className="min-w-[24px] justify-center">
                                {index + 1}
                              </Badge>
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={channel.channel_thumbnail || undefined} />
                                <AvatarFallback>
                                  <Youtube className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                              <span className="flex-1 text-sm font-medium truncate">
                                {channel.channel_title || 'Unnamed Channel'}
                              </span>
                              <div className="flex items-center gap-2">
                                {index > 0 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => moveChannel(index, index - 1)}
                                  >
                                    ↑
                                  </Button>
                                )}
                                {index < selectedChannels.length - 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => moveChannel(index, index + 1)}
                                  >
                                    ↓
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => toggleChannel(channelId)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}

                    {/* Available channels to add */}
                    <p className="text-xs text-muted-foreground pt-2 border-t">
                      Click to add channels
                    </p>
                    <div className="grid gap-2">
                      {availableChannels
                        .filter(c => !selectedChannels.includes(c.id))
                        .map((channel) => (
                          <Card
                            key={channel.id}
                            className="p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => toggleChannel(channel.id)}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={channel.channel_thumbnail || undefined} />
                              <AvatarFallback>
                                <Youtube className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <span className="flex-1 text-sm truncate">
                              {channel.channel_title || 'Unnamed Channel'}
                            </span>
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          </Card>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Pool Stats (for editing) */}
              {isEditing && currentPoolQuota && (
                <Card className="p-4 bg-muted/50">
                  <p className="text-sm font-medium mb-2">Current Pool Status</p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-emerald-600">
                        {currentPoolQuota.totalRemainingUploads}
                      </p>
                      <p className="text-xs text-muted-foreground">Uploads Left</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {currentPoolQuota.channelsWithQuota}
                      </p>
                      <p className="text-xs text-muted-foreground">Active</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-600">
                        {currentPoolQuota.channelsExhausted}
                      </p>
                      <p className="text-xs text-muted-foreground">Exhausted</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !name.trim() || selectedChannels.length === 0}
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Pool'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
