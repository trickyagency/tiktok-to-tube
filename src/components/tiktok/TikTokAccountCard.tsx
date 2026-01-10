import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Video, Users, RefreshCw, Trash2, MoreVertical, Eye, Loader2, ExternalLink, Download, RotateCcw, AlertCircle, Youtube, Lock, UserX, Settings, Heart, CheckCircle2, Clock } from 'lucide-react';
import { TikTokAccountWithOwner, useScrapeVideos, useRefreshTikTokAccount, useDeleteTikTokAccount, useResetTikTokAccount } from '@/hooks/useTikTokAccounts';
import { usePublishedVideosCount } from '@/hooks/useScrapedVideos';
import { useUserAccountLimits } from '@/hooks/useUserAccountLimits';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { AccountYouTubeSettingsDialog } from './AccountYouTubeSettingsDialog';

interface TikTokAccountCardProps {
  account: TikTokAccountWithOwner;
  onViewVideos: (account: TikTokAccountWithOwner) => void;
  isApifyConfigured: boolean;
  index?: number;
}

const RESCRAPE_COOLDOWN_DAYS = 15;

export function TikTokAccountCard({ account, onViewVideos, isApifyConfigured, index }: TikTokAccountCardProps) {
  const { isOwner } = useAuth();
  const [youtubeSettingsOpen, setYoutubeSettingsOpen] = useState(false);
  const scrapeVideos = useScrapeVideos();
  const refreshAccount = useRefreshTikTokAccount();
  const deleteAccount = useDeleteTikTokAccount();
  const resetAccount = useResetTikTokAccount();
  const { data: publishedCount = 0 } = usePublishedVideosCount(account.id);
  const { data: limits } = useUserAccountLimits();
  
  const hasYouTubeSettings = !!(account.youtube_description || account.youtube_tags);
  
  const subscriptionStatus = limits?.subscriptionStatus ?? 'none';
  const subscriptionMessage = limits?.subscriptionMessage ?? '';
  const canScrape = subscriptionStatus === 'active' || limits?.isUnlimited;
  const isScraping = account.scrape_status === 'scraping' || scrapeVideos.isPending;
  const isRefreshing = refreshAccount.isPending;
  
  // 7-day rescrape cooldown logic
  const lastScrapedAt = account.last_scraped_at ? new Date(account.last_scraped_at) : null;
  const daysSinceLastScrape = lastScrapedAt ? differenceInDays(new Date(), lastScrapedAt) : null;
  const canRescrape = daysSinceLastScrape !== null && daysSinceLastScrape >= RESCRAPE_COOLDOWN_DAYS;
  const daysUntilRescrape = daysSinceLastScrape !== null ? Math.max(0, RESCRAPE_COOLDOWN_DAYS - daysSinceLastScrape) : null;
  const isScraped = account.scrape_status === 'completed' && lastScrapedAt !== null;
  const isFailed = account.scrape_status === 'failed';
  const isPending = account.scrape_status === 'pending' || !lastScrapedAt;
  
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

  // Health status indicator
  const getHealthStatus = () => {
    if (account.account_status === 'deleted' || account.account_status === 'not_found') {
      return { color: 'bg-destructive', label: 'Deleted' };
    }
    if (account.account_status === 'private') {
      return { color: 'bg-amber-500', label: 'Private' };
    }
    if (account.scrape_status === 'failed') {
      return { color: 'bg-destructive', label: 'Failed' };
    }
    if (account.scrape_status === 'completed') {
      return { color: 'bg-emerald-500', label: 'Healthy' };
    }
    return { color: 'bg-muted-foreground', label: 'Pending' };
  };

  const healthStatus = getHealthStatus();

  // Determine button state
  const getButtonConfig = () => {
    if (isScraping) {
      return {
        label: 'Importing Videos...',
        icon: <Loader2 className="h-4 w-4 animate-spin mr-2" />,
        variant: 'secondary' as const,
        disabled: true,
        tooltip: 'Videos are being imported'
      };
    }
    if (isFailed) {
      return {
        label: 'Retry Scrape',
        icon: <AlertCircle className="h-4 w-4 mr-2" />,
        variant: 'outline' as const,
        disabled: !isApifyConfigured || !canScrape,
        tooltip: 'Previous scrape failed. Click to retry.'
      };
    }
    if (isScraped && !canRescrape) {
      return {
        label: 'Scraped',
        icon: <CheckCircle2 className="h-4 w-4 mr-2" />,
        variant: 'outline' as const,
        disabled: true,
        tooltip: `ReScrape available in ${daysUntilRescrape} day${daysUntilRescrape !== 1 ? 's' : ''}`
      };
    }
    if (isScraped && canRescrape) {
      return {
        label: 'ReScrape Videos',
        icon: <RefreshCw className="h-4 w-4 mr-2" />,
        variant: 'default' as const,
        disabled: !isApifyConfigured || !canScrape,
        tooltip: 'Fetch new videos from TikTok'
      };
    }
    // Default: pending or never scraped
    return {
      label: 'Scrape Videos',
      icon: <Download className="h-4 w-4 mr-2" />,
      variant: 'default' as const,
      disabled: !isApifyConfigured || !canScrape,
      tooltip: 'Import videos from TikTok'
    };
  };

  const buttonConfig = getButtonConfig();

  return (
    <Card className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 border-border/50 ${isScraping ? 'ring-2 ring-primary/30 shadow-lg shadow-primary/10' : ''} ${isAccountUnavailable ? 'opacity-80' : ''}`}>
      {/* Health indicator stripe */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${healthStatus.color} transition-colors`} />
      
      {/* Index number badge */}
      {typeof index === 'number' && (
        <div className="absolute top-3 left-3 h-6 w-6 rounded-full bg-blue-500 text-white text-xs font-semibold flex items-center justify-center z-10 shadow-md shadow-blue-500/30">
          {index + 1}
        </div>
      )}
      
      <CardContent className="p-5 pt-6">
        <div className="flex items-start gap-4">
          {/* Avatar with status indicator */}
          <div className="relative shrink-0">
            <Avatar className={`h-14 w-14 ring-2 ring-background shadow-md transition-transform group-hover:scale-105 ${isAccountUnavailable ? 'grayscale' : ''}`}>
              <AvatarImage src={account.avatar_url || undefined} alt={account.username} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {account.username[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isScraping && (
              <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            )}
            {/* Health dot indicator */}
            <div className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background ${healthStatus.color} flex items-center justify-center`}>
              {account.account_status === 'private' && <Lock className="h-2 w-2 text-white" />}
              {(account.account_status === 'deleted' || account.account_status === 'not_found') && <UserX className="h-2 w-2 text-white" />}
              {account.scrape_status === 'completed' && !isAccountUnavailable && <CheckCircle2 className="h-2 w-2 text-white" />}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {/* Username and badges */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-base truncate leading-tight">
                  {account.display_name || account.username}
                </h3>
                <p className="text-sm text-muted-foreground">@{account.username}</p>
              </div>
              
              {/* Actions menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onViewVideos(account)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Videos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={openTikTokProfile}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open TikTok Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setYoutubeSettingsOpen(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    YouTube Settings
                    {hasYouTubeSettings && (
                      <Badge variant="secondary" className="ml-auto text-xs py-0 px-1.5">
                        Set
                      </Badge>
                    )}
                  </DropdownMenuItem>
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleDelete} 
                    className="text-destructive focus:text-destructive"
                    disabled={deleteAccount.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Status badges */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {isOwner && (account.owner_email || account.owner_name) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs px-2 py-0 h-5 bg-blue-500/10 text-blue-600 border-blue-500/20 max-w-[180px] truncate cursor-help">
                      Added by: {account.owner_name || account.owner_email}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{account.owner_name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{account.owner_email}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {isScraping && (
                <Badge className="text-xs px-2 py-0 h-5 bg-primary/20 text-primary border-primary/30 animate-pulse">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Importing
                </Badge>
              )}
              {!isScraping && isScraped && !canRescrape && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs px-2 py-0 h-5 text-emerald-600 border-emerald-500/30 bg-emerald-500/10 cursor-help">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Videos Scraped Successfully
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Scraped {daysSinceLastScrape} days ago • ReScrape available in {daysUntilRescrape} days</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {!isScraping && isScraped && canRescrape && (
                <Badge variant="outline" className="text-xs px-2 py-0 h-5 text-primary border-primary/30 bg-primary/10">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  ReScrape Available
                </Badge>
              )}
              {!isScraping && isFailed && (
                <Badge variant="destructive" className="text-xs px-2 py-0 h-5">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Failed
                </Badge>
              )}
              {!isScraping && isPending && !isAccountUnavailable && (
                <Badge variant="outline" className="text-xs px-2 py-0 h-5 text-amber-600 border-amber-500/30 bg-amber-500/10">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Not scraped
                </Badge>
              )}
              {account.account_status === 'private' && (
                <Badge variant="outline" className="text-xs px-2 py-0 h-5 text-amber-500 border-amber-500/30 bg-amber-500/10">
                  <Lock className="h-3 w-3 mr-1" />
                  Private
                </Badge>
              )}
              {(account.account_status === 'deleted' || account.account_status === 'not_found') && (
                <Badge variant="destructive" className="text-xs px-2 py-0 h-5">
                  <UserX className="h-3 w-3 mr-1" />
                  Deleted
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="text-center p-2.5 rounded-lg bg-muted/40 border border-border/50 transition-colors hover:bg-muted/60">
            <div className="flex items-center justify-center gap-1.5">
              <Video className="h-3.5 w-3.5 text-primary" />
              <span className={`font-semibold text-sm ${isScraping ? 'animate-pulse text-primary' : ''}`}>
                {account.video_count}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Videos</p>
          </div>
          <div className="text-center p-2.5 rounded-lg bg-muted/40 border border-border/50 transition-colors hover:bg-muted/60">
            <div className="flex items-center justify-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold text-sm">{formatNumber(account.follower_count)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Followers</p>
          </div>
          <div className="text-center p-2.5 rounded-lg bg-muted/40 border border-border/50 transition-colors hover:bg-muted/60">
            <div className="flex items-center justify-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-red-500" />
              <span className="font-semibold text-sm">{publishedCount}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Uploaded</p>
          </div>
        </div>


        {/* Progress bar during scraping */}
        {isScraping && (
          <div className="mt-4 space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Importing videos...</span>
              <span className="font-medium text-primary tabular-nums">
                {progressCurrent} / {progressTotal > 0 ? `~${progressTotal}` : '?'}
              </span>
            </div>
            <Progress 
              value={progressPercentage} 
              className="h-1.5"
            />
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                {progressCurrent === 0 
                  ? 'Connecting to TikTok API...'
                  : progressCurrent < (progressTotal || Infinity)
                  ? 'Downloading metadata...'
                  : 'Saving to database...'
                }
              </div>
              {isStuckScraping && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  disabled={resetAccount.isPending}
                  className="h-5 px-2 text-xs text-muted-foreground hover:text-destructive"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Last sync info with rescrape countdown */}
        {!isScraping && lastScrapedAt && (
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Video className="h-3 w-3" />
              Scraped {formatDistanceToNow(lastScrapedAt)} ago
            </span>
            {isScraped && !canRescrape && daysUntilRescrape !== null && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                ReScrape in {daysUntilRescrape}d
              </span>
            )}
          </div>
        )}

        {/* Action button */}
        <div className="mt-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={buttonConfig.variant}
                  size="sm"
                  onClick={handleScrapeVideos}
                  disabled={buttonConfig.disabled}
                  className={`w-full h-9 ${isScraped && !canRescrape ? 'opacity-60' : ''}`}
                >
                  {buttonConfig.icon}
                  {buttonConfig.label}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  {!canScrape 
                    ? subscriptionMessage 
                    : !isApifyConfigured 
                    ? 'Scraper API key not configured' 
                    : buttonConfig.tooltip}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>

      <AccountYouTubeSettingsDialog
        account={account}
        open={youtubeSettingsOpen}
        onOpenChange={setYoutubeSettingsOpen}
      />
    </Card>
  );
}
