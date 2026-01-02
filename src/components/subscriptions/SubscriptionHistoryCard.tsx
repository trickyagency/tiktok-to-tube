import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSubscriptionHistory, SubscriptionHistoryEntry } from '@/hooks/useSubscriptionHistory';
import { HistoryTimelineSkeleton } from './MySubscriptionsSkeleton';
import { 
  Plus, 
  RefreshCw, 
  ArrowUpRight, 
  XCircle, 
  Clock,
  History,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const actionConfig: Record<string, { 
  icon: typeof Plus; 
  label: string; 
  gradient: string;
  bgClass: string;
}> = {
  created: { 
    icon: Plus, 
    label: 'Created',
    gradient: 'from-emerald-500 to-green-500',
    bgClass: 'bg-emerald-500'
  },
  renewed: { 
    icon: RefreshCw, 
    label: 'Renewed',
    gradient: 'from-blue-500 to-cyan-500',
    bgClass: 'bg-blue-500'
  },
  upgraded: { 
    icon: ArrowUpRight, 
    label: 'Upgraded',
    gradient: 'from-purple-500 to-pink-500',
    bgClass: 'bg-purple-500'
  },
  downgraded: { 
    icon: ArrowUpRight, 
    label: 'Downgraded',
    gradient: 'from-amber-500 to-orange-500',
    bgClass: 'bg-amber-500'
  },
  cancelled: { 
    icon: XCircle, 
    label: 'Cancelled',
    gradient: 'from-red-500 to-rose-500',
    bgClass: 'bg-red-500'
  },
  expired: { 
    icon: Clock, 
    label: 'Expired',
    gradient: 'from-gray-500 to-slate-500',
    bgClass: 'bg-gray-500'
  },
  modified: { 
    icon: RefreshCw, 
    label: 'Modified',
    gradient: 'from-indigo-500 to-violet-500',
    bgClass: 'bg-indigo-500'
  },
  updated: { 
    icon: RefreshCw, 
    label: 'Updated',
    gradient: 'from-indigo-500 to-violet-500',
    bgClass: 'bg-indigo-500'
  },
};

function HistoryItem({ entry, index, isLast }: { entry: SubscriptionHistoryEntry; index: number; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const config = actionConfig[entry.action] || actionConfig.modified;
  const Icon = config.icon;
  const isLatest = index === 0;

  return (
    <div 
      className="relative pb-6 last:pb-0"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-[7px] top-6 bottom-0 w-0.5 bg-gradient-to-b from-border to-transparent" />
      )}
      
      {/* Timeline dot */}
      <div className="absolute left-0 top-1">
        <div className={cn(
          "h-4 w-4 rounded-full border-2 border-background shadow-sm",
          config.bgClass
        )}>
          {isLatest && (
            <div className={cn(
              "absolute inset-0 rounded-full animate-ping",
              config.bgClass,
              "opacity-50"
            )} />
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="ml-8">
        <div 
          className={cn(
            "group p-4 rounded-xl transition-all duration-300 cursor-pointer",
            "bg-card/50 hover:bg-card/80 backdrop-blur-sm",
            "border border-transparent hover:border-border/50",
            expanded && "bg-card/80 border-border/50"
          )}
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge className={cn(
                "bg-gradient-to-r text-white border-0 shadow-sm",
                config.gradient
              )}>
                <Icon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
              {entry.plan?.name && (
                <span className="text-sm font-medium text-foreground">
                  {entry.plan.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
              </span>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </div>
          </div>
          
          {/* Expanded details */}
          {expanded && (
            <div className="mt-4 pt-4 border-t border-border/50 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{format(new Date(entry.created_at), 'PPP p')}</span>
                </div>
                {entry.account_count && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account Limit</span>
                    <span className="font-medium">{entry.account_count} accounts</span>
                  </div>
                )}
                {entry.expires_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expires</span>
                    <span className="font-medium">{format(new Date(entry.expires_at), 'PPP')}</span>
                  </div>
                )}
                {entry.previous_plan?.name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Previous Plan</span>
                    <span className="font-medium">{entry.previous_plan.name}</span>
                  </div>
                )}
                {entry.performer?.email && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Performed by</span>
                    <span className="font-medium text-xs">{entry.performer.email}</span>
                  </div>
                )}
                {entry.notes && (
                  <div className="pt-2 border-t border-border/30">
                    <p className="text-muted-foreground text-xs">{entry.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyHistory() {
  return (
    <div className="relative flex flex-col items-center justify-center py-12">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 rounded-xl" />
      
      {/* Icon */}
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-xl bg-primary/20 blur-xl" />
        <div className="relative h-16 w-16 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
          <History className="h-8 w-8 text-primary" />
        </div>
      </div>
      
      <h4 className="font-semibold text-foreground mb-1">No History Yet</h4>
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        Your subscription history will appear here as changes are made
      </p>
    </div>
  );
}

export function SubscriptionHistoryCard() {
  const { data: history, isLoading } = useSubscriptionHistory();

  if (isLoading) {
    return <HistoryTimelineSkeleton />;
  }

  return (
    <Card className="relative overflow-hidden bg-card/80 backdrop-blur-xl border-border/50">
      {/* Subtle gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Subscription History</CardTitle>
            <CardDescription>Timeline of your subscription changes</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {!history || history.length === 0 ? (
          <EmptyHistory />
        ) : (
          <div className="relative pl-2">
            {history.map((entry, index) => (
              <HistoryItem 
                key={entry.id} 
                entry={entry} 
                index={index}
                isLast={index === history.length - 1}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
