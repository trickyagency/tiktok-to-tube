import { Button } from '@/components/ui/button';
import { Loader2, PlayCircle } from 'lucide-react';
import { useQueueAllAccounts, useScrapeQueueStats } from '@/hooks/useScrapeQueue';
import { useTikTokAccounts } from '@/hooks/useTikTokAccounts';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ScrapeAllAccountsButtonProps {
  disabled?: boolean;
}

export function ScrapeAllAccountsButton({ disabled }: ScrapeAllAccountsButtonProps) {
  const { data: accounts } = useTikTokAccounts();
  const queueAllAccounts = useQueueAllAccounts();
  const stats = useScrapeQueueStats();

  const hasActiveQueue = stats.pending + stats.processing > 0;
  const accountCount = accounts?.length || 0;

  const handleScrapeAll = () => {
    if (!accounts || accounts.length === 0) return;
    
    const accountIds = accounts.map(a => a.id);
    queueAllAccounts.mutate(accountIds);
  };

  // Calculate estimated time
  const estimatedMinutes = Math.ceil(accountCount * 0.25); // ~15 seconds per account

  if (accountCount === 0) return null;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          disabled={disabled || hasActiveQueue || queueAllAccounts.isPending}
        >
          {queueAllAccounts.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <PlayCircle className="h-4 w-4 mr-2" />
          )}
          Scrape All ({accountCount})
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Scrape All TikTok Accounts?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              This will queue <strong>{accountCount} accounts</strong> for video scraping.
            </p>
            <p>
              Accounts will be processed with rate limiting to avoid API issues. 
              Estimated time: <strong>~{estimatedMinutes} minutes</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              Already published videos will be preserved and not re-imported.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleScrapeAll}>
            Start Scraping
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
