import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Layers, 
  ArrowRight, 
  Youtube, 
  BarChart3,
  ChevronRight,
  Settings
} from 'lucide-react';
import { useChannelPools } from '@/hooks/useChannelPools';
import { usePoolQuotaAggregation } from '@/hooks/usePoolQuotaAggregation';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function RotationStatusWidget() {
  const { pools, isLoading } = useChannelPools();
  const { poolQuotas, totalAcrossAllPools } = usePoolQuotaAggregation(pools);

  // Only show active pools
  const activePools = pools.filter(p => p.is_active);

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-5 w-32 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-24 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (pools.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Channel Rotation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Create channel pools to automatically rotate uploads across multiple YouTube channels.
          </p>
          <Button asChild size="sm" className="w-full">
            <Link to="/dashboard/youtube">
              <Settings className="h-4 w-4 mr-2" />
              Set Up Rotation
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Channel Rotation
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/youtube" className="gap-1">
              Manage
              <ChevronRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Aggregate Stats */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-muted/50">
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {totalAcrossAllPools.totalRemainingUploads}
            </p>
            <p className="text-xs text-muted-foreground">Total Left</p>
          </div>
          <div className="text-center border-x border-border">
            <p className="text-2xl font-bold">
              {totalAcrossAllPools.totalChannelsWithQuota}
            </p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">
              {totalAcrossAllPools.totalChannelsExhausted}
            </p>
            <p className="text-xs text-muted-foreground">Exhausted</p>
          </div>
        </div>

        {/* Pool List */}
        <div className="space-y-3">
          {activePools.slice(0, 3).map((pool) => {
            const quota = poolQuotas.find(q => q.poolId === pool.id);
            const usagePercent = quota?.usagePercentage || 0;
            const members = pool.members || [];
            
            return (
              <div 
                key={pool.id} 
                className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{pool.name}</span>
                    <Badge 
                      variant={quota?.totalRemainingUploads === 0 ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {quota?.totalRemainingUploads || 0} left
                    </Badge>
                  </div>
                  <div className="flex -space-x-1">
                    {members.slice(0, 3).map((member) => (
                      <Avatar 
                        key={member.id} 
                        className="h-5 w-5 border border-background"
                      >
                        <AvatarImage src={member.youtube_channel?.channel_thumbnail || undefined} />
                        <AvatarFallback className="bg-red-500/10">
                          <Youtube className="h-2.5 w-2.5 text-red-500" />
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                </div>
                <Progress 
                  value={usagePercent} 
                  className="h-1.5"
                />
              </div>
            );
          })}
        </div>

        {activePools.length > 3 && (
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link to="/dashboard/youtube">
              View {activePools.length - 3} more pools
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
