import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Layers, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Youtube,
  BarChart3,
  RefreshCw,
  ListOrdered,
  Power,
  PowerOff
} from 'lucide-react';
import { ChannelPool, RotationStrategy, useChannelPools } from '@/hooks/useChannelPools';
import { PoolQuotaInfo } from '@/hooks/usePoolQuotaAggregation';
import { cn } from '@/lib/utils';

const STRATEGY_ICONS: Record<RotationStrategy, typeof BarChart3> = {
  quota_based: BarChart3,
  round_robin: RefreshCw,
  priority: ListOrdered,
};

const STRATEGY_LABELS: Record<RotationStrategy, string> = {
  quota_based: 'Quota Based',
  round_robin: 'Round Robin',
  priority: 'Priority',
};

interface ChannelPoolCardProps {
  pool: ChannelPool;
  quotaInfo?: PoolQuotaInfo;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ChannelPoolCard({ pool, quotaInfo, onEdit, onDelete }: ChannelPoolCardProps) {
  const { updatePool } = useChannelPools();
  const StrategyIcon = STRATEGY_ICONS[pool.rotation_strategy];
  
  const members = pool.members || [];
  const usagePercent = quotaInfo?.usagePercentage || 0;
  const remainingUploads = quotaInfo?.totalRemainingUploads || 0;
  
  const getStatusColor = () => {
    if (!pool.is_active) return 'bg-muted';
    if (remainingUploads === 0) return 'bg-destructive';
    if (usagePercent > 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const handleToggleActive = async () => {
    await updatePool({ id: pool.id, is_active: !pool.is_active });
  };

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all",
      !pool.is_active && "opacity-60"
    )}>
      {/* Status indicator */}
      <div className={cn("absolute top-0 left-0 right-0 h-1", getStatusColor())} />
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                {pool.name}
                {!pool.is_active && (
                  <Badge variant="secondary" className="text-xs">Paused</Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-1.5 mt-0.5">
                <StrategyIcon className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {STRATEGY_LABELS[pool.rotation_strategy]}
                </span>
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Pool
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleActive}>
                {pool.is_active ? (
                  <>
                    <PowerOff className="h-4 w-4 mr-2" />
                    Pause Pool
                  </>
                ) : (
                  <>
                    <Power className="h-4 w-4 mr-2" />
                    Activate Pool
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Pool
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quota Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Today's Quota</span>
            <span className="font-medium">
              {remainingUploads} uploads left
            </span>
          </div>
          <Progress 
            value={usagePercent} 
            className="h-2"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{quotaInfo?.channelsWithQuota || 0} active</span>
            <span>{quotaInfo?.channelsExhausted || 0} exhausted</span>
          </div>
        </div>

        {/* Channel Avatars */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {members.length} channel{members.length !== 1 ? 's' : ''} in pool
          </p>
          <div className="flex items-center">
            <div className="flex -space-x-2">
              {members.slice(0, 5).map((member, index) => {
                const channel = member.youtube_channel;
                return (
                  <Avatar 
                    key={member.id} 
                    className={cn(
                      "h-8 w-8 border-2 border-background",
                      index > 0 && "ring-2 ring-background"
                    )}
                    style={{ zIndex: 5 - index }}
                  >
                    <AvatarImage src={channel?.channel_thumbnail || undefined} />
                    <AvatarFallback className="bg-red-500/10">
                      <Youtube className="h-3 w-3 text-red-500" />
                    </AvatarFallback>
                  </Avatar>
                );
              })}
              {members.length > 5 && (
                <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                  +{members.length - 5}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Channel Status Summary */}
        {quotaInfo && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t">
            {quotaInfo.channels.slice(0, 3).map((channel) => (
              <div 
                key={channel.channelId}
                className="text-center p-2 rounded-lg bg-muted/50"
              >
                <p className={cn(
                  "text-lg font-bold",
                  channel.remainingUploads > 0 ? "text-emerald-600" : "text-muted-foreground"
                )}>
                  {channel.remainingUploads}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {channel.channelTitle?.slice(0, 10) || 'Channel'}
                </p>
              </div>
            ))}
          </div>
        )}

        {pool.description && (
          <p className="text-xs text-muted-foreground pt-2 border-t">
            {pool.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
