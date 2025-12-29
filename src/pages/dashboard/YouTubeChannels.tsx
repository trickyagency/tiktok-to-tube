import { useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Youtube, Loader2 } from 'lucide-react';
import { AddYouTubeChannelDialog } from '@/components/youtube/AddYouTubeChannelDialog';
import { YouTubeChannelCard } from '@/components/youtube/YouTubeChannelCard';
import { GoogleCloudSetupGuide } from '@/components/youtube/GoogleCloudSetupGuide';
import { useYouTubeChannels } from '@/hooks/useYouTubeChannels';
import { toast } from 'sonner';

const YouTubeChannels = () => {
  const { channels, isLoading, refetch } = useYouTubeChannels();

  useEffect(() => {
    document.title = "YouTube Channels | RepostFlow";
  }, []);

  // Listen for OAuth completion messages from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'youtube-oauth-success') {
        const { channelTitle, authStatus } = event.data;
        refetch();
        
        if (authStatus === 'no_channel') {
          toast.info('Authorization successful! Create your YouTube channel and we\'ll detect it automatically.');
        } else {
          toast.success(`Successfully connected: ${channelTitle}`);
        }
      } else if (event.data?.type === 'youtube-oauth-error') {
        toast.error(`Authorization failed: ${event.data.error}`);
        refetch();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [refetch]);

  const connectedChannels = channels.filter(c => c.auth_status === 'connected');
  const pendingChannels = channels.filter(c => c.auth_status !== 'connected');

  return (
    <DashboardLayout
      title="YouTube Channels"
      description="Connect and manage your YouTube channels with per-channel OAuth credentials"
    >
      <div className="space-y-6">
        {/* Setup Guide */}
        <GoogleCloudSetupGuide />

        <div className="flex justify-end">
          <AddYouTubeChannelDialog onSuccess={refetch} />
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : channels.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Youtube className="h-5 w-5 text-red-500" />
                Your Channels
              </CardTitle>
              <CardDescription>
                Each YouTube channel uses its own Google Cloud project credentials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Youtube className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-medium mb-2">No channels connected</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your YouTube channel with Google OAuth credentials to start uploading
                </p>
                <AddYouTubeChannelDialog onSuccess={refetch} />
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Pending Authorization */}
            {pendingChannels.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Pending Authorization ({pendingChannels.length})
                </h2>
                <div className="grid gap-4">
                  {pendingChannels.map((channel) => (
                    <YouTubeChannelCard 
                      key={channel.id} 
                      channel={channel} 
                      onAuthComplete={refetch}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Connected Channels */}
            {connectedChannels.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Connected Channels ({connectedChannels.length})
                </h2>
                <div className="grid gap-4">
                  {connectedChannels.map((channel) => (
                    <YouTubeChannelCard 
                      key={channel.id} 
                      channel={channel}
                      onAuthComplete={refetch}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default YouTubeChannels;
