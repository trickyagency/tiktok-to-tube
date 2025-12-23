import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Video, Users, RefreshCw, Trash2, MoreVertical, Eye, Loader2, ExternalLink, Download } from 'lucide-react';
import { TikTokAccount, useRefreshTikTokAccount, useDeleteTikTokAccount } from '@/hooks/useTikTokAccounts';
import { formatDistanceToNow } from 'date-fns';

interface TikTokAccountCardProps {
  account: TikTokAccount;
  onViewVideos: (account: TikTokAccount) => void;
  isApifyConfigured: boolean;
}

export function TikTokAccountCard({ account, onViewVideos, isApifyConfigured }: TikTokAccountCardProps) {
  const refreshAccount = useRefreshTikTokAccount();
  const deleteAccount = useDeleteTikTokAccount();

  const isScraping = account.scrape_status === 'scraping' || refreshAccount.isPending;

  const handleRefresh = () => {
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

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Card className={`overflow-hidden transition-all ${isScraping ? 'ring-2 ring-primary/20' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="relative">
            <Avatar className="h-16 w-16">
              <AvatarImage src={account.avatar_url || undefined} alt={account.username} />
              <AvatarFallback>{account.username[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            {isScraping && (
              <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
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
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{formatNumber(account.follower_count)}</span>
              </div>
            </div>

            {account.last_scraped_at && !isScraping && (
              <p className="text-xs text-muted-foreground mt-2">
                Last synced {formatDistanceToNow(new Date(account.last_scraped_at))} ago
              </p>
            )}
            {isScraping && (
              <p className="text-xs text-primary mt-2 animate-pulse">
                Scraping videos in background...
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Scrape Now Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleRefresh}
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
              <DropdownMenuItem onClick={handleRefresh} disabled={isScraping}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Profile
              </DropdownMenuItem>
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
