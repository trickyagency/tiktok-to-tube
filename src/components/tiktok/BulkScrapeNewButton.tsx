import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Download } from 'lucide-react';
import { useQueueAllAccounts, useScrapeQueueStats } from '@/hooks/useScrapeQueue';
import { useTikTokAccounts } from '@/hooks/useTikTokAccounts';
import { useUserAccountLimits } from '@/hooks/useUserAccountLimits';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface BulkScrapeNewButtonProps {
  disabled?: boolean;
}

export function BulkScrapeNewButton({ disabled }: BulkScrapeNewButtonProps) {
  const { data: accounts } = useTikTokAccounts();
  const { data: limits } = useUserAccountLimits();
  const queueAllAccounts = useQueueAllAccounts();
  const stats = useScrapeQueueStats();

  const hasActiveQueue = stats.pending + stats.processing > 0;
  
  const subscriptionStatus = limits?.subscriptionStatus ?? 'none';
  const subscriptionMessage = limits?.subscriptionMessage ?? '';
  const canScrape = subscriptionStatus === 'active' || limits?.isUnlimited;

  // Filter to only accounts that have never been scraped
  const eligibleAccounts = useMemo(() => {
    if (!accounts) return [];
    
    return accounts.filter(account => {
      // Never scraped = no last_scraped_at date
      if (account.last_scraped_at) return false;
      // Not currently scraping
      if (account.scrape_status === 'scraping') return false;
      // Account is accessible
      if (account.account_status === 'deleted' || account.account_status === 'private') return false;
      
      return true;
    });
  }, [accounts]);

  const eligibleCount = eligibleAccounts.length;

  const handleScrapeNew = () => {
    if (eligibleCount === 0 || !canScrape) return;
    
    const accountIds = eligibleAccounts.map(a => a.id);
    queueAllAccounts.mutate(accountIds);
  };

  // Calculate estimated time
  const estimatedMinutes = Math.ceil(eligibleCount * 0.25); // ~15 seconds per account

  // Don't render if no accounts exist at all
  if (!accounts || accounts.length === 0) return null;

  // If no eligible accounts, show disabled button with tooltip
  if (eligibleCount === 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" disabled className="opacity-60">
            <Download className="h-4 w-4 mr-2" />
            Scrape New (0)
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>All accounts have been scraped at least once.</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // If subscription is not active, show disabled button with tooltip
  if (!canScrape) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" disabled className="opacity-60">
            <Download className="h-4 w-4 mr-2" />
            Scrape New ({eligibleCount})
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{subscriptionMessage}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

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
            <Download className="h-4 w-4 mr-2" />
          )}
          Scrape New ({eligibleCount})
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Scrape {eligibleCount} New TikTok Accounts?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                The following accounts have never been scraped and will be queued:
              </p>
              
              {eligibleCount <= 10 && (
                <ul className="list-disc list-inside text-sm space-y-1 bg-muted/50 rounded-md p-3">
                  {eligibleAccounts.map(account => (
                    <li key={account.id}>
                      <span className="font-medium">@{account.username}</span>
                      <span className="text-muted-foreground"> (never scraped)</span>
                    </li>
                  ))}
                </ul>
              )}
              
              {eligibleCount > 10 && (
                <p className="text-sm bg-muted/50 rounded-md p-3">
                  Including @{eligibleAccounts[0]?.username}, @{eligibleAccounts[1]?.username}, 
                  and {eligibleCount - 2} more accounts.
                </p>
              )}
              
              <p>
                Estimated time: <strong>~{estimatedMinutes} minutes</strong>
              </p>
              
              <p className="text-sm text-muted-foreground">
                This will import all available videos from these accounts.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleScrapeNew}>
            Start Scraping
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
