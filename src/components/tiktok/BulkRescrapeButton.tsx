import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { useQueueAllAccounts, useScrapeQueueStats } from '@/hooks/useScrapeQueue';
import { useTikTokAccounts } from '@/hooks/useTikTokAccounts';
import { useUserAccountLimits } from '@/hooks/useUserAccountLimits';
import { differenceInDays } from 'date-fns';
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

const RESCRAPE_COOLDOWN_DAYS = 7;

interface BulkRescrapeButtonProps {
  disabled?: boolean;
}

export function BulkRescrapeButton({ disabled }: BulkRescrapeButtonProps) {
  const { data: accounts } = useTikTokAccounts();
  const { data: limits } = useUserAccountLimits();
  const queueAllAccounts = useQueueAllAccounts();
  const stats = useScrapeQueueStats();

  const hasActiveQueue = stats.pending + stats.processing > 0;
  
  const subscriptionStatus = limits?.subscriptionStatus ?? 'none';
  const subscriptionMessage = limits?.subscriptionMessage ?? '';
  const canScrape = subscriptionStatus === 'active' || limits?.isUnlimited;

  // Filter to only accounts eligible for rescrape (7+ days since last scrape)
  const eligibleAccounts = useMemo(() => {
    if (!accounts) return [];
    
    return accounts.filter(account => {
      const lastScrapedAt = account.last_scraped_at ? new Date(account.last_scraped_at) : null;
      if (!lastScrapedAt) return false; // Never scraped - not eligible for RE-scrape
      if (account.scrape_status !== 'completed') return false;
      
      const daysSinceLastScrape = differenceInDays(new Date(), lastScrapedAt);
      return daysSinceLastScrape >= RESCRAPE_COOLDOWN_DAYS;
    });
  }, [accounts]);

  const eligibleCount = eligibleAccounts.length;

  const handleRescrapeAll = () => {
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
            <RefreshCw className="h-4 w-4 mr-2" />
            ReScrape (0)
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>No accounts are ready for rescrape. Accounts become eligible 7 days after their last scrape.</p>
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
            <RefreshCw className="h-4 w-4 mr-2" />
            ReScrape ({eligibleCount})
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
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          ReScrape ({eligibleCount})
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ReScrape {eligibleCount} TikTok Accounts?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                The following accounts will be queued for re-scraping to fetch new videos:
              </p>
              
              {eligibleCount <= 10 && (
                <ul className="list-disc list-inside text-sm space-y-1 bg-muted/50 rounded-md p-3">
                  {eligibleAccounts.map(account => {
                    const daysSince = differenceInDays(new Date(), new Date(account.last_scraped_at!));
                    return (
                      <li key={account.id}>
                        <span className="font-medium">@{account.username}</span>
                        <span className="text-muted-foreground"> (scraped {daysSince} days ago)</span>
                      </li>
                    );
                  })}
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
                Already published videos will remain marked as uploaded and won't be duplicated.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRescrapeAll}>
            Start ReScraping
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
