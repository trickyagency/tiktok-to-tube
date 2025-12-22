import { useState } from 'react';
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
  Video
} from 'lucide-react';
import { YouTubeChannel, useYouTubeChannels } from '@/hooks/useYouTubeChannels';
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

interface YouTubeChannelCardProps {
  channel: YouTubeChannel;
  onAuthComplete?: () => void;
}

export function YouTubeChannelCard({ channel, onAuthComplete }: YouTubeChannelCardProps) {
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { startOAuth, refreshToken, deleteChannel, isDeleting } = useYouTubeChannels();
  const { data: tikTokAccounts = [] } = useTikTokAccounts();

  const linkedTikTokAccount = tikTokAccounts.find(a => a.id === channel.tiktok_account_id);

  const handleAuthorize = async () => {
    setIsAuthorizing(true);
    
    // Listen for OAuth completion message from popup
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
    
    // Timeout fallback
    setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      setIsAuthorizing(false);
    }, 120000); // 2 minute timeout
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshToken(channel.id);
    setIsRefreshing(false);
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
          {/* Channel Avatar */}
          <Avatar className="h-16 w-16 rounded-lg">
            {channel.channel_thumbnail ? (
              <AvatarImage src={channel.channel_thumbnail} alt={channel.channel_title || 'Channel'} />
            ) : (
              <AvatarFallback className="rounded-lg bg-red-500/10">
                <Youtube className="h-8 w-8 text-red-500" />
              </AvatarFallback>
            )}
          </Avatar>

          {/* Channel Info */}
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
              </div>
            )}

            {linkedTikTokAccount && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <LinkIcon className="h-3.5 w-3.5" />
                Linked to @{linkedTikTokAccount.username}
              </div>
            )}

            {isTokenExpired && channel.auth_status === 'connected' && (
              <p className="text-xs text-amber-500 mt-1">
                Token expired - click refresh to renew
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {channel.auth_status !== 'connected' ? (
              <Button 
                size="sm" 
                onClick={handleAuthorize}
                disabled={isAuthorizing}
              >
                {isAuthorizing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Authorizing...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Authorize
                  </>
                )}
              </Button>
            ) : (
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
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
                    Any scheduled uploads will be cancelled. This action cannot be undone.
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
