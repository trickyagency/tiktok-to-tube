import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  MoreVertical, 
  Play, 
  Pause, 
  Trash2, 
  CheckCircle2,
  Trophy,
  Clock
} from 'lucide-react';
import { ABTest, useABTests } from '@/hooks/useABTests';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ABTestCardProps {
  test: ABTest;
}

export function ABTestCard({ test }: ABTestCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { updateTest, deleteTest, calculateConfidence, isUpdating, isDeleting } = useABTests();

  const confidence = calculateConfidence(test);
  const totalUploads = test.total_uploads_a + test.total_uploads_b;
  const hasEnoughData = totalUploads >= 20;

  const getStatusBadge = () => {
    switch (test.status) {
      case 'running':
        return <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">Running</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      case 'completed':
        return <Badge variant="outline">Completed</Badge>;
    }
  };

  const getWinnerIndicator = () => {
    if (!test.winner) return null;
    return (
      <div className="flex items-center gap-1 text-yellow-500">
        <Trophy className="h-4 w-4" />
        <span className="text-sm font-medium">Variant {test.winner.toUpperCase()} wins!</span>
      </div>
    );
  };

  const handleToggleStatus = () => {
    updateTest({
      id: test.id,
      status: test.status === 'running' ? 'paused' : 'running',
    });
  };

  const handleComplete = () => {
    const winner = test.success_rate_a > test.success_rate_b ? 'a' : 
                   test.success_rate_b > test.success_rate_a ? 'b' : null;
    updateTest({
      id: test.id,
      status: 'completed',
      winner,
      end_date: new Date().toISOString(),
    });
  };

  const handleDelete = () => {
    deleteTest(test.id);
    setShowDeleteDialog(false);
  };

  const formatTimes = (times: string[]) => times.join(', ');

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{test.test_name}</h3>
                {getStatusBadge()}
              </div>
              <p className="text-xs text-muted-foreground">
                {test.youtube_channel?.channel_title || 'Unknown Channel'}
              </p>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {test.status !== 'completed' && (
                  <>
                    <DropdownMenuItem onClick={handleToggleStatus} disabled={isUpdating}>
                      {test.status === 'running' ? (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Pause Test
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Resume Test
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleComplete} disabled={isUpdating}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      End Test
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Variants Comparison */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Variant A */}
            <div className={cn(
              "p-3 rounded-lg border",
              test.winner === 'a' && "border-yellow-500 bg-yellow-500/5"
            )}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Variant A</span>
                {test.winner === 'a' && <Trophy className="h-4 w-4 text-yellow-500" />}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <Clock className="h-3 w-3" />
                {formatTimes(test.variant_a_times)}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{test.total_uploads_a} uploads</span>
                  <span className="font-medium">{test.success_rate_a.toFixed(0)}% success</span>
                </div>
                <Progress value={test.success_rate_a} className="h-2" />
              </div>
            </div>

            {/* Variant B */}
            <div className={cn(
              "p-3 rounded-lg border",
              test.winner === 'b' && "border-yellow-500 bg-yellow-500/5"
            )}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Variant B</span>
                {test.winner === 'b' && <Trophy className="h-4 w-4 text-yellow-500" />}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <Clock className="h-3 w-3" />
                {formatTimes(test.variant_b_times)}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{test.total_uploads_b} uploads</span>
                  <span className="font-medium">{test.success_rate_b.toFixed(0)}% success</span>
                </div>
                <Progress value={test.success_rate_b} className="h-2" />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="text-xs text-muted-foreground">
              {hasEnoughData ? (
                <span>Confidence: <span className="font-medium">{confidence.toFixed(0)}%</span></span>
              ) : (
                <span>Need {20 - totalUploads} more uploads for results</span>
              )}
            </div>
            {getWinnerIndicator()}
            <div className="text-xs text-muted-foreground">
              Started {formatDistanceToNow(new Date(test.start_date), { addSuffix: true })}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete A/B Test?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{test.test_name}" and all its data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
