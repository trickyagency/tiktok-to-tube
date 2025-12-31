import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Sparkles, ChevronDown, ChevronUp, Clock, Plus, Wand2, Loader2, Info } from 'lucide-react';
import { useSmartScheduling, TimeSuggestion } from '@/hooks/useSmartScheduling';
import { cn } from '@/lib/utils';

interface SmartTimeSuggestionsProps {
  youtubeChannelId?: string;
  onApplyTime: (time: string) => void;
  onApplyAll: (times: string[]) => void;
  currentTimes: string[];
}

function ConfidenceBadge({ confidence }: { confidence: TimeSuggestion['confidence'] }) {
  const variants = {
    high: 'bg-green-500/10 text-green-600 border-green-500/20',
    medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    low: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <Badge variant="outline" className={cn('text-xs font-medium', variants[confidence])}>
      {confidence.charAt(0).toUpperCase() + confidence.slice(1)}
    </Badge>
  );
}

function DayTypeBadge({ dayType }: { dayType: TimeSuggestion['dayType'] }) {
  const labels = {
    weekdays: 'Weekdays',
    weekends: 'Weekends',
    daily: 'Daily',
  };

  return (
    <Badge variant="secondary" className="text-xs">
      {labels[dayType]}
    </Badge>
  );
}

function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function SmartTimeSuggestions({
  youtubeChannelId,
  onApplyTime,
  onApplyAll,
  currentTimes,
}: SmartTimeSuggestionsProps) {
  const [isOpen, setIsOpen] = useState(true);
  const { suggestions, isLoading } = useSmartScheduling(youtubeChannelId);

  const availableSuggestions = suggestions.filter(
    (s) => !currentTimes.includes(s.time)
  );

  const topTimes = availableSuggestions.slice(0, 3).map((s) => s.time);

  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Analyzing optimal posting times...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Smart Scheduling</CardTitle>
                <CardDescription className="text-xs">
                  AI-powered posting time recommendations
                </CardDescription>
              </div>
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {/* Suggestion List */}
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => {
                const isAlreadyAdded = currentTimes.includes(suggestion.time);
                
                return (
                  <div
                    key={`${suggestion.time}-${suggestion.dayType}-${index}`}
                    className={cn(
                      'flex items-center justify-between p-2 rounded-lg border transition-colors',
                      isAlreadyAdded
                        ? 'bg-muted/50 border-border opacity-60'
                        : 'bg-background border-border hover:border-primary/30'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {formatTimeDisplay(suggestion.time)}
                          </span>
                          <DayTypeBadge dayType={suggestion.dayType} />
                          <ConfidenceBadge confidence={suggestion.confidence} />
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs text-muted-foreground flex items-center gap-1 cursor-help">
                                <Info className="h-3 w-3" />
                                {suggestion.reason}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs max-w-[200px]">
                                Score: {suggestion.score}/100 — {suggestion.reason}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isAlreadyAdded}
                      onClick={() => onApplyTime(suggestion.time)}
                      className="shrink-0"
                    >
                      {isAlreadyAdded ? (
                        <span className="text-xs text-muted-foreground">Added</span>
                      ) : (
                        <>
                          <Plus className="h-3 w-3 mr-1" />
                          Apply
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Apply All Button */}
            {availableSuggestions.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-primary/30 hover:bg-primary/10"
                onClick={() => onApplyAll(topTimes)}
              >
                <Wand2 className="h-3 w-3 mr-2" />
                Apply Top {topTimes.length} Suggestions
              </Button>
            )}

            {availableSuggestions.length === 0 && (
              <p className="text-xs text-center text-muted-foreground py-2">
                All suggested times have been added
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
