import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
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
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Copy
} from 'lucide-react';
import { YouTubeChannelWithOwner, useYouTubeChannels } from '@/hooks/useYouTubeChannels';
import { useAuth } from '@/contexts/AuthContext';
import { useTikTokAccounts } from '@/hooks/useTikTokAccounts';
import { useScrapedVideos } from '@/hooks/useScrapedVideos';
import { useYouTubeQuota } from '@/hooks/useYouTubeQuota';
import { useCurrentUserSubscription } from '@/hooks/useCurrentUserSubscription';
import { QuotaIndicator } from '@/components/quota/QuotaIndicator';
import { toast } from 'sonner';
import { OAUTH_REDIRECT_URI } from '@/lib/api-config';
import { supabase } from '@/integrations/supabase/client';
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
  channel: YouTubeChannelWithOwner;
  onAuthComplete?: () => void;
}

// Status color mapping
const getStatusColors = (status: string | null) => {
  switch (status) {
    case 'connected':
      return {
        gradient: 'from-emerald-500 via-emerald-400 to-emerald-500',
        ring: 'ring-emerald-500/30',
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-600',
        border: 'border-emerald-500/30',
        dot: 'bg-emerald-500',
        glow: 'shadow-emerald-500/20'
      };
    case 'pending':
    case 'authorizing':
      return {
        gradient: 'from-blue-500 via-blue-400 to-blue-500',
        ring: 'ring-blue-500/30',
        bg: 'bg-blue-500/10',
        text: 'text-blue-600',
        border: 'border-blue-500/30',
        dot: 'bg-blue-500',
        glow: 'shadow-blue-500/20'
      };
    case 'no_channel':
      return {
        gradient: 'from-amber-500 via-amber-400 to-amber-500',
        ring: 'ring-amber-500/30',
        bg: 'bg-amber-500/10',
        text: 'text-amber-600',
        border: 'border-amber-500/30',
        dot: 'bg-amber-500',
        glow: 'shadow-amber-500/20'
      };
    case 'failed':
    case 'token_revoked':
      return {
        gradient: 'from-red-500 via-red-400 to-red-500',
        ring: 'ring-red-500/30',
        bg: 'bg-red-500/10',
        text: 'text-red-600',
        border: 'border-red-500/30',
        dot: 'bg-red-500',
        glow: 'shadow-red-500/20'
      };
    default:
      return {
        gradient: 'from-muted via-muted to-muted',
        ring: 'ring-muted/30',
        bg: 'bg-muted/10',
        text: 'text-muted-foreground',
        border: 'border-muted/30',
        dot: 'bg-muted',
        glow: 'shadow-muted/20'
      };
  }
};

export function YouTubeChannelCard({ channel, onAuthComplete }: YouTubeChannelCardProps) {
  const { isOwner } = useAuth();
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [secondsUntilCheck, setSecondsUntilCheck] = useState(30);
  const [isManualChecking, setIsManualChecking] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const pollingRef = useRef<{ intervalId: NodeJS.Timeout | null; timeoutId: NodeJS.Timeout | null }>({
    intervalId: null,
    timeoutId: null,
  });
  
  const { startOAuth, refreshToken, deleteChannel, updateChannel, checkForChannel, isDeleting } = useYouTubeChannels();
  const { data: tikTokAccounts = [] } = useTikTokAccounts();
  
  const linkedTikTokAccount = tikTokAccounts.find(a => a.id === channel.tiktok_account_id);
  const { data: linkedAccountVideos = [] } = useScrapedVideos(channel.tiktok_account_id);
  const { data: quotaData } = useYouTubeQuota(channel.id);
  const channelQuota = quotaData?.[0];
  const { data: subscriptionData } = useCurrentUserSubscription();

  const statusColors = getStatusColors(channel.auth_status);

  // Countdown timer effect
  useEffect(() => {
    if (!isPolling) return;
    
    const countdownId = setInterval(() => {
      setSecondsUntilCheck(prev => {
        if (prev <= 1) return 30;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownId);
  }, [isPolling]);

  // Automatic polling for no_channel status
  useEffect(() => {
    if (channel.auth_status !== 'no_channel') {
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
      setSecondsUntilCheck(30);
    };

    setIsPolling(true);
    setSecondsUntilCheck(30);
    pollingRef.current.intervalId = setInterval(poll, 30000);
    
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
      setSecondsUntilCheck(30);
    } finally {
      setIsManualChecking(false);
    }
  };

  const handleAuthorize = async () => {
    const authRequestId = Math.random().toString(36).slice(2, 10);
    console.log(`[Auth Flow][${authRequestId}] Starting authorization for channel:`, channel.id.slice(0, 8));
    
    setIsAuthorizing(true);
    setAuthFailed(false);
    
    // Track if we've already detected completion
    let completed = false;
    let pollErrors = 0;
    const maxPollErrors = 3;
    
    const handleMessage = (event: MessageEvent) => {
      if (completed) return;
      console.log(`[Auth Flow][${authRequestId}] Received message:`, event.data?.type);
      
      if (event.data?.type === 'youtube-oauth-success') {
        completed = true;
        console.log(`[Auth Flow][${authRequestId}] OAuth success via postMessage`);
        window.removeEventListener('message', handleMessage);
        setIsAuthorizing(false);
        setAuthFailed(false);
        onAuthComplete?.();
      } else if (event.data?.type === 'youtube-oauth-error') {
        completed = true;
        console.log(`[Auth Flow][${authRequestId}] OAuth error via postMessage:`, event.data?.error);
        window.removeEventListener('message', handleMessage);
        setIsAuthorizing(false);
        setAuthFailed(true);
        if (event.data?.error) {
          toast.error(event.data.error);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    
    await startOAuth(channel.id);
    
    console.log(`[Auth Flow][${authRequestId}] OAuth popup opened, starting status polling`);
    
    // Start polling to detect auth completion even if postMessage fails
    const pollInterval = setInterval(async () => {
      if (completed) {
        clearInterval(pollInterval);
        return;
      }
      
      try {
        console.log(`[Auth Flow][${authRequestId}] Polling for status update...`);
        
        const { data, error } = await supabase
          .from('youtube_channels')
          .select('auth_status')
          .eq('id', channel.id)
          .single();
        
        if (error) {
          pollErrors++;
          console.warn(`[Auth Flow][${authRequestId}] Polling error (${pollErrors}/${maxPollErrors}):`, error.message);
          
          if (pollErrors >= maxPollErrors) {
            console.error(`[Auth Flow][${authRequestId}] Max poll errors reached, stopping`);
            clearInterval(pollInterval);
            window.removeEventListener('message', handleMessage);
            setIsAuthorizing(false);
            toast.error('Failed to check authorization status. Please refresh the page.');
          }
          return;
        }
        
        pollErrors = 0; // Reset on success
        
        console.log(`[Auth Flow][${authRequestId}] Current status:`, data?.auth_status);
        
        if (data?.auth_status && 
            data.auth_status !== 'authorizing' && 
            data.auth_status !== 'pending') {
          completed = true;
          clearInterval(pollInterval);
          window.removeEventListener('message', handleMessage);
          setIsAuthorizing(false);
          
          console.log(`[Auth Flow][${authRequestId}] Status changed to:`, data.auth_status);
          
          if (data.auth_status === 'connected') {
            toast.success('YouTube channel connected successfully!');
            setAuthFailed(false);
          } else if (data.auth_status === 'no_channel') {
            toast.info('Connected, but no YouTube channel found on this Google account');
            setAuthFailed(false);
          } else if (data.auth_status === 'failed') {
            setAuthFailed(true);
          }
          
          onAuthComplete?.();
        }
      } catch (err) {
        pollErrors++;
        console.error(`[Auth Flow][${authRequestId}] Polling exception (${pollErrors}/${maxPollErrors}):`, err);
        
        if (pollErrors >= maxPollErrors) {
          clearInterval(pollInterval);
          window.removeEventListener('message', handleMessage);
          setIsAuthorizing(false);
        }
      }
    }, 3000);
    
    // Stop polling after 90 seconds timeout (increased from 60)
    setTimeout(() => {
      if (!completed) {
        console.log(`[Auth Flow][${authRequestId}] Polling timeout reached`);
        clearInterval(pollInterval);
        window.removeEventListener('message', handleMessage);
        setIsAuthorizing(false);
        // Don't mark as failed - user might still complete in popup
      }
    }, 90000);
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
    const baseClass = "gap-1.5 font-medium transition-all duration-200";
    switch (channel.auth_status) {
      case 'connected':
        return (
          <Badge className={cn(baseClass, statusColors.bg, statusColors.text, statusColors.border, "border")}>
            <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", statusColors.dot)} />
            Connected
          </Badge>
        );
      case 'no_channel':
        return (
          <Badge className={cn(baseClass, statusColors.bg, statusColors.text, statusColors.border, "border")}>
            <AlertCircle className="h-3 w-3" />
            No YouTube Channel
          </Badge>
        );
      case 'authorizing':
        return (
          <Badge className={cn(baseClass, statusColors.bg, statusColors.text, statusColors.border, "border")}>
            <RefreshCw className="h-3 w-3 animate-spin" />
            Authorizing...
          </Badge>
        );
      case 'failed':
        return (
          <Badge className={cn(baseClass, statusColors.bg, statusColors.text, statusColors.border, "border")}>
            <AlertCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className={cn(baseClass)}>
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  const needsReconnect = 
    channel.auth_status === 'failed' || 
    channel.auth_status === 'token_revoked' ||
    (channel.auth_status === 'connected' && !channel.refresh_token);

  // Check if redirect URI is outdated
  const hasOutdatedRedirectUri = channel.google_redirect_uri && 
    channel.google_redirect_uri !== OAUTH_REDIRECT_URI;

  const handleCopyRedirectUri = () => {
    navigator.clipboard.writeText(OAUTH_REDIRECT_URI);
    toast.success('Redirect URI copied to clipboard');
  };

  return (
    <Card className={cn(
      "group relative overflow-hidden",
      "bg-card/80 backdrop-blur-xl",
      "border border-border/50",
      "shadow-lg shadow-black/5",
      "hover:shadow-xl hover:-translate-y-1",
      "transition-all duration-300 ease-out",
      statusColors.glow
    )}>
      {/* Top gradient stripe */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
        statusColors.gradient
      )} />

      {/* Loading overlay during OAuth */}
      {isAuthorizing && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-xl">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-sm font-medium">Waiting for authorization...</p>
          <p className="text-xs text-muted-foreground mt-1">Complete the process in the popup window</p>
        </div>
      )}

      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar with status ring */}
          <div className="relative shrink-0">
            <Avatar className={cn(
              "h-16 w-16 rounded-xl ring-2 ring-offset-2 ring-offset-background transition-all duration-300",
              statusColors.ring,
              "group-hover:scale-105"
            )}>
              {channel.channel_thumbnail ? (
                <AvatarImage src={channel.channel_thumbnail} alt={channel.channel_title || 'Channel'} className="object-cover" />
              ) : (
                <AvatarFallback className="rounded-xl bg-red-500/10">
                  <Youtube className="h-8 w-8 text-red-500" />
                </AvatarFallback>
              )}
            </Avatar>
            {/* Status dot */}
            <div className={cn(
              "absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background",
              statusColors.dot,
              channel.auth_status === 'connected' && "animate-pulse"
            )} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Header with title and badges */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="font-semibold text-lg truncate">
                {channel.channel_title || 'Unnamed Channel'}
              </h3>
              {getStatusBadge()}
            </div>

            {/* Owner badge */}
            {isOwner && channel.owner_email && (
              <Badge variant="outline" className="text-xs bg-blue-500/5 text-blue-600 border-blue-500/20 mb-2">
                <Sparkles className="h-3 w-3 mr-1" />
                Owner: {channel.owner_email}
              </Badge>
            )}

            {/* Outdated Redirect URI Warning */}
            {hasOutdatedRedirectUri && (
              <div className="mt-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-amber-600 font-medium">Redirect URI may be outdated</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Update your Google Cloud Console to use the recommended redirect URI for reliable authorization.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyRedirectUri}
                  className="mt-2 h-7 text-xs"
                >
                  <Copy className="h-3 w-3 mr-1.5" />
                  Copy Recommended URI
                </Button>
              </div>
            )}

            {/* Stats grid for connected channels */}
            {channel.auth_status === 'connected' && (
              <div className="grid grid-cols-3 gap-2 mt-3 p-3 rounded-xl bg-muted/30 border border-border/30">
                <div className="text-center p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-default">
                  <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm font-semibold">{channel.subscriber_count?.toLocaleString() || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Subscribers</p>
                </div>
                <div className="text-center p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-default">
                  <Video className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm font-semibold">{channel.video_count || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Videos</p>
                </div>
                <div className="text-center p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-default">
                  <LinkIcon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className={cn("text-sm font-semibold", linkedTikTokAccount ? "text-primary" : "text-amber-500")}>
                    {linkedTikTokAccount ? '1' : '0'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Linked</p>
                </div>
              </div>
            )}

            {/* No channel instructions */}
            {channel.auth_status === 'no_channel' && (
              <div className="mt-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <p className="text-sm text-amber-600 mb-2 font-medium">Your Google account doesn't have a YouTube channel yet.</p>
                <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600 text-[10px] font-bold">1</span>
                    <a 
                      href="https://www.youtube.com/create_channel" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Create YouTube Channel
                    </a>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600 text-[10px] font-bold">2</span>
                    We'll detect it automatically, or click "Re-authorize"
                  </span>
                </div>
                {isPolling && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-amber-500/20">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <RefreshCw className="h-3 w-3 animate-spin text-primary" />
                      Next check in <span className="font-mono font-medium">{secondsUntilCheck}s</span>
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleManualCheck}
                      disabled={isManualChecking}
                      className="h-6 px-2 text-xs ml-auto"
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
            {channel.auth_status === 'connected' && (
              <div className="mt-3">
                {linkedTikTokAccount ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-2 border border-primary/20">
                      <LinkIcon className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm font-medium">@{linkedTikTokAccount.username}</span>
                      <Badge variant="secondary" className="text-[10px] h-5">
                        <Video className="h-2.5 w-2.5 mr-1" />
                        {linkedAccountVideos.length}
                      </Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-muted">
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="rounded-xl">
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
                        <DropdownMenuItem onClick={() => handleLinkTikTok(null)} className="text-destructive">
                          <Unlink className="h-3.5 w-3.5 mr-2" />
                          Unlink
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 px-3 text-xs rounded-lg border-dashed">
                        <LinkIcon className="h-3 w-3 mr-1.5" />
                        Link TikTok Account
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="rounded-xl">
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
              </div>
            )}

            {channel.auth_status === 'token_revoked' && (
              <p className="text-xs text-amber-500 mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                Refresh token revoked - please reconnect your channel
              </p>
            )}

            {/* Authorization failed banner with retry */}
            {(channel.auth_status === 'failed' || authFailed) && channel.auth_status !== 'connected' && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-red-600 font-medium">Authorization failed</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This could happen if you denied access or there was a connection issue.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleAuthorize}
                  disabled={isAuthorizing}
                  className="mt-3 w-full bg-red-500 hover:bg-red-600 text-white"
                >
                  {isAuthorizing ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Retrying...</>
                  ) : (
                    <><RotateCcw className="h-4 w-4 mr-2" />Retry Authorization</>
                  )}
                </Button>
              </div>
            )}

            {/* Quota Indicator for connected channels */}
            {channel.auth_status === 'connected' && channelQuota && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <QuotaIndicator 
                  quota={channelQuota} 
                  dailyLimit={subscriptionData?.maxVideosPerDay || 2}
                  isUnlimited={subscriptionData?.isUnlimited}
                />
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 shrink-0">
            {channel.auth_status === 'no_channel' ? (
              <Button 
                size="sm" 
                onClick={handleAuthorize} 
                disabled={isAuthorizing}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/20"
              >
                {isAuthorizing ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Re-authorizing...</>
                ) : (
                  <><RotateCcw className="h-4 w-4 mr-2" />Re-authorize</>
                )}
              </Button>
            ) : channel.auth_status !== 'connected' ? (
              <Button 
                size="sm" 
                onClick={handleAuthorize} 
                disabled={isAuthorizing}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20"
              >
                {isAuthorizing ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Authorizing...</>
                ) : (
                  <><ExternalLink className="h-4 w-4 mr-2" />Authorize</>
                )}
              </Button>
            ) : needsReconnect ? (
              <Button size="sm" variant="outline" onClick={handleAuthorize} disabled={isAuthorizing}>
                <RotateCcw className={`h-4 w-4 mr-2 ${isAuthorizing ? 'animate-spin' : ''}`} />
                {isAuthorizing ? 'Reconnecting...' : 'Reconnect'}
              </Button>
            ) : null}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove YouTube Channel?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove "{channel.channel_title}" from your account. 
                    Any scheduled uploads will be cancelled.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteChannel(channel.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
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
