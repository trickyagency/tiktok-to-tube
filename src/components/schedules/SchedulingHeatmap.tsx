import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  ChevronDown, 
  ChevronUp, 
  Flame, 
  Loader2,
  TrendingUp,
  Clock
} from 'lucide-react';
import { useSchedulingHeatmap, HeatmapCell } from '@/hooks/useSchedulingHeatmap';
import { useYouTubeChannels } from '@/hooks/useYouTubeChannels';
import { cn } from '@/lib/utils';

interface SchedulingHeatmapProps {
  onSelectTime?: (hour: number, dayOfWeek: number) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 65) return 'bg-lime-500';
  if (score >= 50) return 'bg-yellow-500';
  if (score >= 35) return 'bg-orange-500';
  return 'bg-red-500';
}

function getScoreOpacity(score: number): string {
  if (score >= 80) return 'opacity-100';
  if (score >= 60) return 'opacity-90';
  if (score >= 40) return 'opacity-75';
  return 'opacity-60';
}

function formatHourShort(hour: number): string {
  if (hour === 0) return '12a';
  if (hour === 12) return '12p';
  if (hour < 12) return `${hour}a`;
  return `${hour - 12}p`;
}

export function SchedulingHeatmap({ onSelectTime }: SchedulingHeatmapProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const { channels } = useYouTubeChannels();
  
  const { heatmapData, bestTimes, isLoading } = useSchedulingHeatmap(
    selectedChannel !== 'all' ? selectedChannel : undefined
  );

  const getCellData = (dayOfWeek: number, hour: number): HeatmapCell | undefined => {
    return heatmapData.find(
      (cell) => cell.dayOfWeek === dayOfWeek && cell.hour === hour
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Flame className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Optimal Posting Times</CardTitle>
              <CardDescription className="text-xs">
                Based on your channel's performance data
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {channels.length > 1 && (
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue placeholder="All Channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.channel_title || 'Unnamed Channel'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Best Times Summary */}
              {bestTimes.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Best times:</span>
                  {bestTimes.slice(0, 3).map((cell, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {cell.dayName.slice(0, 3)} {cell.time}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Heatmap Grid */}
              <ScrollArea className="w-full">
                <div className="min-w-[600px]">
                  {/* Hour Labels */}
                  <div className="flex mb-1">
                    <div className="w-12 shrink-0" />
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="flex-1 text-center text-[10px] text-muted-foreground"
                      >
                        {hour % 3 === 0 ? formatHourShort(hour) : ''}
                      </div>
                    ))}
                  </div>

                  {/* Heatmap Rows */}
                  <TooltipProvider delayDuration={100}>
                    {DAYS.map((day, dayIndex) => (
                      <div key={day} className="flex mb-1">
                        <div className="w-12 shrink-0 text-xs text-muted-foreground flex items-center">
                          {day}
                        </div>
                        {HOURS.map((hour) => {
                          const cell = getCellData(dayIndex, hour);
                          const score = cell?.score || 50;

                          return (
                            <Tooltip key={hour}>
                              <TooltipTrigger asChild>
                                <button
                                  className={cn(
                                    'flex-1 h-6 mx-px rounded-sm transition-all hover:ring-2 hover:ring-primary hover:ring-offset-1',
                                    getScoreColor(score),
                                    getScoreOpacity(score)
                                  )}
                                  onClick={() => onSelectTime?.(hour, dayIndex)}
                                />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[200px]">
                                <div className="space-y-1">
                                  <p className="font-semibold">
                                    {cell?.dayName} at {cell?.time}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs">Score:</span>
                                    <Badge
                                      variant={
                                        score >= 80
                                          ? 'default'
                                          : score >= 60
                                          ? 'secondary'
                                          : 'outline'
                                      }
                                      className="text-xs"
                                    >
                                      {Math.round(score)}/100
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {cell?.reason}
                                  </p>
                                  {cell && cell.uploadsCount > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                      {cell.uploadsCount} uploads ({Math.round(cell.successRate * 100)}% success)
                                    </p>
                                  )}
                                  {onSelectTime && (
                                    <p className="text-xs text-primary mt-1">
                                      Click to apply this time
                                    </p>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    ))}
                  </TooltipProvider>

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Engagement:</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded-sm bg-red-500 opacity-60" />
                      <span className="text-xs text-muted-foreground">Low</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded-sm bg-yellow-500 opacity-75" />
                      <span className="text-xs text-muted-foreground">Avg</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded-sm bg-green-500" />
                      <span className="text-xs text-muted-foreground">High</span>
                    </div>
                  </div>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
