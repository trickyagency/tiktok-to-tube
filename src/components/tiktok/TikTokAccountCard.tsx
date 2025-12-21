import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Video, Users, RefreshCw, Trash2, MoreVertical, Eye, Loader2 } from 'lucide-react';
import { TikTokAccount, useRefreshTikTokAccount, useDeleteTikTokAccount } from '@/hooks/useTikTokAccounts';
import { formatDistanceToNow } from 'date-fns';

interface TikTokAccountCardProps {
  account: TikTokAccount;
  onViewVideos: (account: TikTokAccount) => void;
}

export function TikTokAccountCard({ account, onViewVideos }: TikTokAccountCardProps) {
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

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={account.avatar_url || undefined} alt={account.username} />
            <AvatarFallback>{account.username[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">
                {account.display_name || account.username}
              </h3>
              {isScraping && (
                <Badge variant="secondary" className="shrink-0">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Scraping
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">@{account.username}</p>

            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Video className="h-4 w-4" />
                <span className="font-medium text-foreground">{account.video_count}</span>
                <span>videos</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{formatNumber(account.follower_count)}</span>
              </div>
            </div>

            {account.last_scraped_at && (
              <p className="text-xs text-muted-foreground mt-2">
                Last scraped {formatDistanceToNow(new Date(account.last_scraped_at))} ago
              </p>
            )}
          </div>

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
              <DropdownMenuItem onClick={handleRefresh} disabled={isScraping}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
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
      </CardContent>
    </Card>
  );
}
