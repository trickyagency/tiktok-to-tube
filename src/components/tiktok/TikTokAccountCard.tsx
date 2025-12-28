import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Video, Users, RefreshCw, Trash2, MoreVertical, Eye, Loader2, ExternalLink, Download, RotateCcw, AlertCircle, Youtube, Lock, UserX } from 'lucide-react';
import { TikTokAccount, useScrapeVideos, useRefreshTikTokAccount, useDeleteTikTokAccount, useResetTikTokAccount } from '@/hooks/useTikTokAccounts';
import { usePublishedVideosCount } from '@/hooks/useScrapedVideos';
import { formatDistanceToNow } from 'date-fns';

interface TikTokAccountCardProps {
  account: TikTokAccount;
  onViewVideos: (account: TikTokAccount) => void;
  isApifyConfigured: boolean;
}

export function TikTokAccountCard({ account, onViewVideos, isApifyConfigured }: TikTokAccountCardProps) {
  const scrapeVideos = useScrapeVideos();
  const refreshAccount = useRefreshTikTokAccount();
  const deleteAccount = useDeleteTikTokAccount();
  const resetAccount = useResetTikTokAccount();
  const { data: publishedCount = 0 } = usePublishedVideosCount(account.id);

  const isScraping = account.scrape_status === 'scraping' || scrapeVideos.isPending;
  const isRefreshing = refreshAccount.isPending;
  
  // Progress tracking
  const progressCurrent = account.scrape_progress_current || 0;
  const progressTotal = account.scrape_progress_total || 0;
  const progressPercentage = progressTotal > 0 ? Math.round((progressCurrent / progressTotal) * 100) : 0;

  const handleScrapeVideos = () => {
    scrapeVideos.mutate({ accountId: account.id, username: account.username });
  };

  const handleSyncProfile = () => {
    refreshAccount.mutate({ accountId: account.id, username: account.username });
  };

  const handleDelete = () => {
    if (confirm(`Delete @${account.username} and all scraped videos?`)) {
      deleteAccount.mutate(account.id);
    }
  };

  const openTikTokProfile = () => {
    window.open(`https://www.tiktok.com/@${account.username}`, '_blank');
  };

  const handleReset = () => {
    resetAccount.mutate(account.id);
  };

  // Show reset button if scraping for more than 5 minutes
  const scrapingStartedAt = new Date(account.updated_at);
  const isStuckScraping = isScraping && (Date.now() - scrapingStartedAt.getTime() > 5 * 60 * 1000);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const isAccountUnavailable = account.account_status === 'private' || account.account_status === 'deleted' || account.account_status === 'not_found';

  return (
    <Card className={`overflow-hidden transition-all ${isScraping ? 'ring-2 ring-primary/20' : ''} ${isAccountUnavailable ? 'opacity-75' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="relative">
            <Avatar className={`h-16 w-16 ${isAccountUnavailable ? 'grayscale' : ''}`}>
              <AvatarImage src={account.avatar_url || undefined} alt={account.username} />
              <AvatarFallback>{account.username[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            {isScraping && (
              <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            )}
            {isAccountUnavailable && !isScraping && (
              <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                {account.account_status === 'private' ? (
                  <Lock className="h-4 w-4 text-amber-500" />
                ) : (
                  <UserX className="h-4 w-4 text-destructive" />
                )}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">
                {account.display_name || account.username}
              </h3>
              {isScraping && (
                <Badge variant="secondary" className="shrink-0 animate-pulse">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Importing...
                </Badge>
              )}
              {!isScraping && account.scrape_status === 'completed' && (
                <Badge variant="outline" className="shrink-0 text-green-600 border-green-600/30">
                  Synced
                </Badge>
              )}
              {!isScraping && account.scrape_status === 'failed' && (
                <Badge variant="destructive" className="shrink-0">
                  Failed
                </Badge>
              )}
              {!isScraping && account.scrape_status === 'pending' && !isAccountUnavailable && (
                <Badge variant="outline" className="shrink-0 text-amber-600 border-amber-600/30">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Videos not scraped
                </Badge>
              )}
              {account.account_status === 'private' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="shrink-0 text-amber-500 border-amber-500/30 bg-amber-500/10">
                        <Lock className="h-3 w-3 mr-1" />
                        Private Account
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This TikTok account is private. Videos cannot be scraped.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {(account.account_status === 'deleted' || account.account_status === 'not_found') && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="destructive" className="shrink-0">
                        <UserX className="h-3 w-3 mr-1" />
                        Account Deleted
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This TikTok account no longer exists or has been deleted.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="text-sm text-muted-foreground">@{account.username}</p>

            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Video className="h-4 w-4" />
                <span className={`font-medium text-foreground ${isScraping ? 'animate-pulse' : ''}`}>
                  {account.video_count}
                </span>
                <span>videos</span>
                {isScraping && (
                  <span className="text-xs text-primary ml-1">(updating...)</span>
                )}
              </div>
              {publishedCount > 0 && (
                <div className="flex items-center gap-1">
                  <Youtube className="h-4 w-4 text-red-500" />
                  <span className="font-medium text-foreground">{publishedCount}</span>
                  <span>uploaded</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{formatNumber(account.follower_count)}</span>
              </div>
            </div>

            {/* Progress bar during scraping */}
            {isScraping && (
              <div className="mt-3 space-y-2">
                <Progress 
                  value={progressPercentage} 
                  className="h-2 transition-all duration-300"
                />
                
                {/* Live stats row */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center">
                      <Video className="h-3 w-3 mr-1 text-primary animate-pulse" />
                      <span className="font-medium text-primary tabular-nums transition-all duration-200">
                        {progressCurrent}
                      </span>
                      <span className="text-muted-foreground ml-1">
                        / {progressTotal > 0 ? `~${progressTotal}` : '?'} videos
                      </span>
                    </span>
                  </div>
                  
                  {isStuckScraping && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      disabled={resetAccount.isPending}
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset
                    </Button>
                  )}
                </div>
                
                {/* Phase indicator */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  {progressCurrent === 0 
                    ? 'Connecting to TikTok API...'
                    : progressCurrent < (progressTotal || Infinity)
                    ? 'Downloading video metadata...'
                    : 'Saving to database...'
                  }
                </div>
              </div>
            )}

            {!isScraping && (account.last_profile_synced_at || account.last_scraped_at) && (
              <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                {account.last_profile_synced_at && (
                  <p className="flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    Profile synced {formatDistanceToNow(new Date(account.last_profile_synced_at))} ago
                  </p>
                )}
                {account.last_scraped_at && (
                  <p className="flex items-center gap-1">
                    <Video className="h-3 w-3" />
                    Videos scraped {formatDistanceToNow(new Date(account.last_scraped_at))} ago
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Scrape Now Button - uses Apify */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleScrapeVideos}
                    disabled={isScraping || !isApifyConfigured}
                    className="shrink-0"
                  >
                    {isScraping ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Scrape Now
                  </Button>
                </TooltipTrigger>
                {!isApifyConfigured && (
                  <TooltipContent>
                    <p>Apify API key not configured</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewVideos(account)}>
                <Eye className="h-4 w-4 mr-2" />
                View Videos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openTikTokProfile}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open TikTok Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSyncProfile} disabled={isRefreshing || isScraping}>
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sync Profile
              </DropdownMenuItem>
              {isScraping && (
                <DropdownMenuItem onClick={handleReset} disabled={resetAccount.isPending}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Cancel Scrape
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={handleDelete} 
                className="text-destructive"
                disabled={deleteAccount.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
