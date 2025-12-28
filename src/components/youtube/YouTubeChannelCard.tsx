import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Youtube, 
  ExternalLink, 
  RefreshCw, 
  Trash2, 
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  Video,
  Unlink,
  RotateCcw
} from 'lucide-react';
import { YouTubeChannel, useYouTubeChannels } from '@/hooks/useYouTubeChannels';
import { useTikTokAccounts } from '@/hooks/useTikTokAccounts';
import { useScrapedVideos } from '@/hooks/useScrapedVideos';
import { useYouTubeQuota } from '@/hooks/useYouTubeQuota';
import { QuotaIndicator } from '@/components/quota/QuotaIndicator';
import { toast } from 'sonner';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface YouTubeChannelCardProps {
  channel: YouTubeChannel;
  onAuthComplete?: () => void;
}

export function YouTubeChannelCard({ channel, onAuthComplete }: YouTubeChannelCardProps) {
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [secondsUntilCheck, setSecondsUntilCheck] = useState(30);
  const [isManualChecking, setIsManualChecking] = useState(false);
  const pollingRef = useRef<{ intervalId: NodeJS.Timeout | null; timeoutId: NodeJS.Timeout | null }>({
    intervalId: null,
    timeoutId: null,
  });
  
  const { startOAuth, refreshToken, deleteChannel, updateChannel, checkForChannel, isDeleting } = useYouTubeChannels();
  const { data: tikTokAccounts = [] } = useTikTokAccounts();
  
  const linkedTikTokAccount = tikTokAccounts.find(a => a.id === channel.tiktok_account_id);
  
  // Fetch video count for the linked TikTok account
  const { data: linkedAccountVideos = [] } = useScrapedVideos(channel.tiktok_account_id);
  
  // Fetch quota for this specific channel
  const { data: quotaData } = useYouTubeQuota(channel.id);
  const channelQuota = quotaData?.[0];

  // Countdown timer effect
  useEffect(() => {
    if (!isPolling) return;
    
    const countdownId = setInterval(() => {
      setSecondsUntilCheck(prev => {
        if (prev <= 1) return 30; // Reset when hitting 0
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownId);
  }, [isPolling]);

  // Automatic polling for no_channel status
  useEffect(() => {
    if (channel.auth_status !== 'no_channel') {
      // Clear any existing polling
      if (pollingRef.current.intervalId) clearInterval(pollingRef.current.intervalId);
      if (pollingRef.current.timeoutId) clearTimeout(pollingRef.current.timeoutId);
      setIsPolling(false);
      return;
    }

    const poll = async () => {
      const result = await checkForChannel(channel.id);
      if (result.found) {
        toast.success(`YouTube channel "${result.channelTitle}" detected!`);
        if (pollingRef.current.intervalId) clearInterval(pollingRef.current.intervalId);
        if (pollingRef.current.timeoutId) clearTimeout(pollingRef.current.timeoutId);
        setIsPolling(false);
        onAuthComplete?.();
      }
      setSecondsUntilCheck(30); // Reset countdown after each check
    };

    // Start polling every 30 seconds
    setIsPolling(true);
    setSecondsUntilCheck(30);
    pollingRef.current.intervalId = setInterval(poll, 30000);
    
    // Stop polling after 5 minutes
    pollingRef.current.timeoutId = setTimeout(() => {
      if (pollingRef.current.intervalId) {
        clearInterval(pollingRef.current.intervalId);
        setIsPolling(false);
      }
    }, 5 * 60 * 1000);

    return () => {
      if (pollingRef.current.intervalId) clearInterval(pollingRef.current.intervalId);
      if (pollingRef.current.timeoutId) clearTimeout(pollingRef.current.timeoutId);
    };
  }, [channel.auth_status, channel.id, checkForChannel, onAuthComplete]);

  const handleManualCheck = async () => {
    setIsManualChecking(true);
    try {
      const result = await checkForChannel(channel.id);
      if (result.found) {
        toast.success(`YouTube channel "${result.channelTitle}" detected!`);
        if (pollingRef.current.intervalId) clearInterval(pollingRef.current.intervalId);
        if (pollingRef.current.timeoutId) clearTimeout(pollingRef.current.timeoutId);
        setIsPolling(false);
        onAuthComplete?.();
      } else {
        toast.info('No YouTube channel found yet. Keep waiting or create one first.');
      }
      setSecondsUntilCheck(30); // Reset countdown after manual check
    } finally {
      setIsManualChecking(false);
    }
  };



  const handleAuthorize = async () => {
    setIsAuthorizing(true);
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'youtube-oauth-success') {
        window.removeEventListener('message', handleMessage);
        setIsAuthorizing(false);
        onAuthComplete?.();
      } else if (event.data?.type === 'youtube-oauth-error') {
        window.removeEventListener('message', handleMessage);
        setIsAuthorizing(false);
      }
    };
    window.addEventListener('message', handleMessage);
    await startOAuth(channel.id);
    setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      setIsAuthorizing(false);
    }, 120000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshToken(channel.id);
    setIsRefreshing(false);
  };

  const handleLinkTikTok = async (accountId: string | null) => {
    await updateChannel({ id: channel.id, tiktok_account_id: accountId });
  };

  const getStatusBadge = () => {
    switch (channel.auth_status) {
      case 'connected':
        return (
          <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        );
      case 'no_channel':
        return (
          <Badge variant="default" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            No YouTube Channel
          </Badge>
        );
      case 'authorizing':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Authorizing...
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const isTokenExpired = channel.token_expires_at 
    ? new Date(channel.token_expires_at) < new Date() 
    : false;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 rounded-lg">
            {channel.channel_thumbnail ? (
              <AvatarImage src={channel.channel_thumbnail} alt={channel.channel_title || 'Channel'} />
            ) : (
              <AvatarFallback className="rounded-lg bg-red-500/10">
                <Youtube className="h-8 w-8 text-red-500" />
              </AvatarFallback>
            )}
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">
                {channel.channel_title || 'Unnamed Channel'}
              </h3>
              {getStatusBadge()}
            </div>

            {channel.auth_status === 'connected' && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {channel.subscriber_count.toLocaleString()} subscribers
                </span>
                <span className="flex items-center gap-1">
                  <Video className="h-3.5 w-3.5" />
                  {channel.video_count} videos
                </span>
                {linkedTikTokAccount ? (
                  <span className="flex items-center gap-1 text-primary">
                    <LinkIcon className="h-3.5 w-3.5" />
                    <span className="font-medium">@{linkedTikTokAccount.username}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-500">
                    <Unlink className="h-3.5 w-3.5" />
                    Not linked
                  </span>
                )}
              </div>
            )}

            {channel.auth_status === 'no_channel' && (
              <div className="text-sm text-amber-600 mb-2">
                <p className="mb-2">Your Google account doesn't have a YouTube channel yet.</p>
                <div className="flex flex-col gap-1 text-muted-foreground">
                  <span className="font-medium text-amber-600">Steps to connect:</span>
                  <span>1. <a 
                    href="https://www.youtube.com/create_channel" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Create YouTube Channel
                  </a></span>
                  <span>2. We'll detect it automatically, or click "Re-authorize"</span>
                </div>
                {isPolling && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Next check in {secondsUntilCheck}s
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleManualCheck}
                      disabled={isManualChecking}
                      className="h-6 px-2 text-xs"
                    >
                      {isManualChecking ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        'Check Now'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* TikTok Link Display & Dropdown */}
            {linkedTikTokAccount ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-primary/10 rounded-md px-2.5 py-1.5">
                  <LinkIcon className="h-3.5 w-3.5 text-primary" />
                  <span className="text-sm font-medium">@{linkedTikTokAccount.username}</span>
                  <Badge variant="secondary" className="text-xs">
                    <Video className="h-2.5 w-2.5 mr-1" />
                    {linkedAccountVideos.length} videos
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {tikTokAccounts.map((account) => (
                      <DropdownMenuItem
                        key={account.id}
                        onClick={() => handleLinkTikTok(account.id)}
                        className={account.id === channel.tiktok_account_id ? 'bg-accent' : ''}
                      >
                        @{account.username}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleLinkTikTok(null)}>
                      <Unlink className="h-3.5 w-3.5 mr-2" />
                      Unlink
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                    <LinkIcon className="h-3 w-3 mr-1" />
                    Link TikTok Account
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {tikTokAccounts.map((account) => (
                    <DropdownMenuItem
                      key={account.id}
                      onClick={() => handleLinkTikTok(account.id)}
                    >
                      @{account.username}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {isTokenExpired && channel.auth_status === 'connected' && (
              <p className="text-xs text-amber-500 mt-1">
                Token expired - click refresh to renew
              </p>
            )}

            {/* Quota Indicator for connected channels */}
            {channel.auth_status === 'connected' && channelQuota && (
              <div className="mt-3 pt-3 border-t">
                <QuotaIndicator quota={channelQuota} />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {channel.auth_status === 'no_channel' ? (
              <Button 
                size="sm" 
                onClick={handleAuthorize} 
                disabled={isAuthorizing}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                {isAuthorizing ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Re-authorizing...</>
                ) : (
                  <><RotateCcw className="h-4 w-4 mr-2" />Re-authorize</>
                )}
              </Button>
            ) : channel.auth_status !== 'connected' ? (
              <Button size="sm" onClick={handleAuthorize} disabled={isAuthorizing}>
                {isAuthorizing ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Authorizing...</>
                ) : (
                  <><ExternalLink className="h-4 w-4 mr-2" />Authorize</>
                )}
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh Token'}
              </Button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove YouTube Channel?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove "{channel.channel_title}" from your account. 
                    Any scheduled uploads will be cancelled.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteChannel(channel.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Removing...' : 'Remove'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
