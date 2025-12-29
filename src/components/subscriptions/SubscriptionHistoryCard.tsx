import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubscriptionHistory, SubscriptionHistoryEntry } from '@/hooks/useSubscriptionHistory';
import { 
  History, 
  Plus, 
  RefreshCw, 
  ArrowUp, 
  ArrowDown, 
  XCircle, 
  Clock,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const actionConfig: Record<string, { icon: typeof Plus; label: string; color: string }> = {
  created: { icon: Plus, label: 'Subscription Created', color: 'text-green-500' },
  renewed: { icon: RefreshCw, label: 'Subscription Renewed', color: 'text-blue-500' },
  upgraded: { icon: ArrowUp, label: 'Plan Upgraded', color: 'text-purple-500' },
  downgraded: { icon: ArrowDown, label: 'Plan Downgraded', color: 'text-amber-500' },
  cancelled: { icon: XCircle, label: 'Subscription Cancelled', color: 'text-destructive' },
  expired: { icon: Clock, label: 'Subscription Expired', color: 'text-muted-foreground' },
  updated: { icon: Edit, label: 'Subscription Updated', color: 'text-blue-500' },
};

function HistoryItem({ entry }: { entry: SubscriptionHistoryEntry }) {
  const config = actionConfig[entry.action] || actionConfig.updated;
  const Icon = config.icon;

  const getDescription = () => {
    const parts: string[] = [];

    if (entry.action === 'upgraded' || entry.action === 'downgraded') {
      if (entry.previous_plan && entry.plan) {
        parts.push(`${entry.previous_plan.name} → ${entry.plan.name}`);
      }
      if (entry.previous_account_count !== null && entry.account_count !== null && 
          entry.previous_account_count !== entry.account_count) {
        parts.push(`${entry.previous_account_count} → ${entry.account_count} accounts`);
      }
    } else if (entry.plan) {
      parts.push(entry.plan.name);
      if (entry.account_count) {
        parts.push(`${entry.account_count} account${entry.account_count !== 1 ? 's' : ''}`);
      }
    }

    if (entry.expires_at) {
      parts.push(`Expires ${format(new Date(entry.expires_at), 'MMM d, yyyy')}`);
    }

    return parts.join(' • ');
  };

  return (
    <div className="flex gap-3 py-3 border-b border-border/50 last:border-0">
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
        config.color === 'text-green-500' && 'bg-green-500/10',
        config.color === 'text-blue-500' && 'bg-blue-500/10',
        config.color === 'text-purple-500' && 'bg-purple-500/10',
        config.color === 'text-amber-500' && 'bg-amber-500/10',
        config.color === 'text-destructive' && 'bg-destructive/10',
        config.color === 'text-muted-foreground' && 'bg-muted',
      )}>
        <Icon className={cn("h-4 w-4", config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-sm">{config.label}</p>
          <time className="text-xs text-muted-foreground shrink-0">
            {format(new Date(entry.created_at), 'MMM d, yyyy')}
          </time>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          {getDescription()}
        </p>
        {entry.notes && (
          <p className="text-xs text-muted-foreground mt-1 italic">
            "{entry.notes}"
          </p>
        )}
        {entry.performer && (
          <p className="text-xs text-muted-foreground mt-1">
            by {entry.performer.full_name || entry.performer.email}
          </p>
        )}
      </div>
    </div>
  );
}

export function SubscriptionHistoryCard() {
  const { data: history, isLoading } = useSubscriptionHistory();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Subscription History
        </CardTitle>
        <CardDescription>
          Timeline of your subscription changes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : !history || history.length === 0 ? (
          <div className="text-center py-8">
            <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No History Yet</h3>
            <p className="text-muted-foreground text-sm">
              Your subscription changes will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {history.map((entry) => (
              <HistoryItem key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
