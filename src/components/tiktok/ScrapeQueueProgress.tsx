import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  X,
  Trash2 
} from 'lucide-react';
import { 
  useScrapeQueue, 
  useScrapeQueueStats, 
  useRetryFailedItems, 
  useClearCompletedItems,
  useCancelPendingItems,
  useClearStuckItems 
} from '@/hooks/useScrapeQueue';

export function ScrapeQueueProgress() {
  const { data: queue, isLoading } = useScrapeQueue();
  const stats = useScrapeQueueStats();
  const retryFailed = useRetryFailedItems();
  const clearCompleted = useClearCompletedItems();
  const cancelPending = useCancelPendingItems();
  const clearStuck = useClearStuckItems();

  // Don't show if no queue items
  if (isLoading || !queue || queue.length === 0) {
    return null;
  }

  // Check for stuck processing items (older than 30 minutes)
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  const stuckProcessingCount = queue.filter(
    q => q.status === 'processing' && q.started_at && new Date(q.started_at) < thirtyMinutesAgo
  ).length;
  const hasStuckItems = stuckProcessingCount > 0 && stats.pending === 0;

  const activeItems = stats.pending + stats.processing;
  const totalProcessed = stats.completed + stats.failed;
  const progressPercentage = stats.total > 0 
    ? Math.round((totalProcessed / stats.total) * 100) 
    : 0;

  // Calculate estimated time remaining
  const estimatedMinutes = Math.ceil(activeItems * 0.25); // ~15 seconds per item

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {activeItems > 0 ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Bulk Scraping in Progress
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                Scraping Complete
              </>
            )}
          </CardTitle>
          {activeItems > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => cancelPending.mutate()}
              disabled={cancelPending.isPending}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progressPercentage} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{totalProcessed} of {stats.total} accounts processed</span>
            {activeItems > 0 && (
              <span>~{estimatedMinutes} min remaining</span>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="rounded-md bg-muted/50 p-2">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="text-xs">Pending</span>
            </div>
            <div className="text-lg font-semibold">{stats.pending}</div>
          </div>
          <div className="rounded-md bg-blue-500/10 p-2">
            <div className="flex items-center justify-center gap-1 text-blue-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-xs">Active</span>
            </div>
            <div className="text-lg font-semibold">{stats.processing}</div>
          </div>
          <div className="rounded-md bg-green-500/10 p-2">
            <div className="flex items-center justify-center gap-1 text-green-500">
              <CheckCircle className="h-3 w-3" />
              <span className="text-xs">Success</span>
            </div>
            <div className="text-lg font-semibold">{stats.completed}</div>
          </div>
          <div className="rounded-md bg-red-500/10 p-2">
            <div className="flex items-center justify-center gap-1 text-red-500">
              <XCircle className="h-3 w-3" />
              <span className="text-xs">Failed</span>
            </div>
            <div className="text-lg font-semibold">{stats.failed}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          {hasStuckItems && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => clearStuck.mutate()}
              disabled={clearStuck.isPending}
            >
              {clearStuck.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Force Clear Stuck ({stuckProcessingCount})
            </Button>
          )}
          {stats.failed > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => retryFailed.mutate()}
              disabled={retryFailed.isPending}
            >
              {retryFailed.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Retry Failed ({stats.failed})
            </Button>
          )}
          {stats.completed > 0 && activeItems === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearCompleted.mutate()}
              disabled={clearCompleted.isPending}
            >
              {clearCompleted.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Clear Completed
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
