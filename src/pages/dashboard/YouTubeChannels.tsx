import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Youtube, Loader2, Search, X } from 'lucide-react';
import { AddYouTubeChannelDialog } from '@/components/youtube/AddYouTubeChannelDialog';
import { YouTubeChannelCard } from '@/components/youtube/YouTubeChannelCard';
import { GoogleCloudSetupGuide } from '@/components/youtube/GoogleCloudSetupGuide';
import { useYouTubeChannels } from '@/hooks/useYouTubeChannels';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const YouTubeChannels = () => {
  const { isOwner } = useAuth();
  const { channels, isLoading, refetch } = useYouTubeChannels();
  const [searchQuery, setSearchQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');

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

  // Get unique owner emails for filter dropdown (only for owners)
  const ownerEmails = useMemo(() => {
    if (!channels || !isOwner) return [];
    const emails = channels.map(c => (c as any).owner_email).filter(Boolean) as string[];
    return [...new Set(emails)];
  }, [channels, isOwner]);

  // Filter channels based on search and owner filter
  const filteredChannels = useMemo(() => {
    if (!channels) return [];
    
    return channels.filter(channel => {
      const ownerEmail = (channel as any).owner_email?.toLowerCase() || '';
      
      // Search filter (channel_title, owner_email)
      const matchesSearch = searchQuery === '' || 
        channel.channel_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ownerEmail.includes(searchQuery.toLowerCase());
      
      // Owner filter (only for owners viewing all channels)
      const matchesOwner = ownerFilter === 'all' || 
        (channel as any).owner_email === ownerFilter;
      
      return matchesSearch && matchesOwner;
    });
  }, [channels, searchQuery, ownerFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setOwnerFilter('all');
  };

  const hasActiveFilters = searchQuery !== '' || ownerFilter !== 'all';

  const connectedChannels = filteredChannels.filter(c => c.auth_status === 'connected');
  const pendingChannels = filteredChannels.filter(c => c.auth_status !== 'connected');

  return (
    <DashboardLayout
      title="YouTube Channels"
      description="Connect and manage your YouTube channels with per-channel OAuth credentials"
    >
      <div className="space-y-6">
        {/* Setup Guide */}
        <GoogleCloudSetupGuide />

        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="flex flex-wrap gap-3 items-center flex-1">
            {/* Search and Filter (for owners) */}
            {isOwner && channels.length > 0 && (
              <>
                <div className="relative min-w-[200px] max-w-md flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by channel name or owner email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {ownerEmails.length > 0 && (
                  <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by owner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Owners</SelectItem>
                      {ownerEmails.map((email) => (
                        <SelectItem key={email} value={email}>
                          {email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
                {hasActiveFilters && (
                  <span className="text-sm text-muted-foreground">
                    Showing {filteredChannels.length} of {channels.length}
                  </span>
                )}
              </>
            )}
          </div>
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
