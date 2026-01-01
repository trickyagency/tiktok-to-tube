import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Youtube, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';
import { AddYouTubeChannelDialog } from '@/components/youtube/AddYouTubeChannelDialog';
import { YouTubeChannelCard } from '@/components/youtube/YouTubeChannelCard';
import { YouTubeChannelsTable } from '@/components/youtube/YouTubeChannelsTable';
import { GoogleCloudSetupGuide } from '@/components/youtube/GoogleCloudSetupGuide';
import { YouTubeFiltersToolbar } from '@/components/youtube/YouTubeFiltersToolbar';
import { YouTubeEmptyState } from '@/components/youtube/YouTubeEmptyState';
import { 
  YouTubeStatsSkeleton, 
  YouTubeCardsSkeleton, 
  YouTubeFiltersSkeleton 
} from '@/components/youtube/YouTubeChannelsSkeleton';
import { useYouTubeChannels } from '@/hooks/useYouTubeChannels';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const YouTubeChannels = () => {
  const { isOwner } = useAuth();
  const { channels = [], isLoading, refetch, startOAuth, refreshToken, deleteChannel, isDeleting } = useYouTubeChannels();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [authorizingChannelId, setAuthorizingChannelId] = useState<string | null>(null);
  const [refreshingChannelId, setRefreshingChannelId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

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

  // Calculate stats
  const stats = useMemo(() => {
    if (!channels) return { total: 0, connected: 0, pending: 0, failed: 0 };
    return {
      total: channels.length,
      connected: channels.filter(c => c.auth_status === 'connected').length,
      pending: channels.filter(c => ['pending', 'no_channel'].includes(c.auth_status || '')).length,
      failed: channels.filter(c => c.auth_status === 'failed').length,
    };
  }, [channels]);

  // Filter and sort channels
  const filteredChannels = useMemo(() => {
    if (!channels) return [];
    
    let result = channels.filter(channel => {
      const ownerEmail = (channel as any).owner_email?.toLowerCase() || '';
      
      // Search filter
      const matchesSearch = searchQuery === '' || 
        channel.channel_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ownerEmail.includes(searchQuery.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || 
        channel.auth_status === statusFilter ||
        (statusFilter === 'pending' && ['pending', 'authorizing'].includes(channel.auth_status || ''));
      
      // Owner filter
      const matchesOwner = ownerFilter === 'all' || 
        (channel as any).owner_email === ownerFilter;
      
      return matchesSearch && matchesStatus && matchesOwner;
    });

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.channel_title || '').localeCompare(b.channel_title || '');
        case 'subscribers':
          return (b.subscriber_count || 0) - (a.subscriber_count || 0);
        case 'updated':
          return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
        case 'recent':
        default:
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
    });

    return result;
  }, [channels, searchQuery, statusFilter, ownerFilter, sortBy]);

  const handleReauthorize = async (channelId: string) => {
    setAuthorizingChannelId(channelId);
    await startOAuth(channelId);
    setAuthorizingChannelId(null);
  };

  const handleRefresh = async (channelId: string) => {
    setRefreshingChannelId(channelId);
    await refreshToken(channelId);
    setRefreshingChannelId(null);
  };

  const handleDelete = (channelId: string) => {
    deleteChannel(channelId);
  };

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

        {/* Stats Cards */}
        {isLoading ? (
          <YouTubeStatsSkeleton />
        ) : channels.length > 0 && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Channels</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Youtube className="h-4 w-4 text-red-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">YouTube channels</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Connected</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.connected}</div>
                <p className="text-xs text-muted-foreground">Ready to upload</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
                <p className="text-xs text-muted-foreground">Need authorization</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <XCircle className="h-4 w-4 text-red-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                <p className="text-xs text-muted-foreground">Need attention</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters Toolbar */}
        {isLoading ? (
          <YouTubeFiltersSkeleton />
        ) : channels.length > 0 && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <YouTubeFiltersToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                sortBy={sortBy}
                onSortByChange={setSortBy}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                ownerFilter={ownerFilter}
                onOwnerFilterChange={setOwnerFilter}
                ownerEmails={ownerEmails}
                isOwner={isOwner}
                totalCount={channels.length}
                filteredCount={filteredChannels.length}
              />
            </div>
            <AddYouTubeChannelDialog onSuccess={refetch} />
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <YouTubeCardsSkeleton />
        ) : channels.length === 0 ? (
          <>
            <YouTubeEmptyState onAddChannel={() => setAddDialogOpen(true)} />
            <AddYouTubeChannelDialog 
              open={addDialogOpen} 
              onOpenChange={setAddDialogOpen}
              showTrigger={false}
              onSuccess={() => {
                refetch();
                setAddDialogOpen(false);
              }} 
            />
          </>
        ) : viewMode === 'table' ? (
          <YouTubeChannelsTable
            channels={filteredChannels}
            isOwner={isOwner}
            onReauthorize={handleReauthorize}
            onRefresh={handleRefresh}
            onDelete={handleDelete}
            isAuthorizing={authorizingChannelId}
            isRefreshing={refreshingChannelId}
            isDeleting={isDeleting}
          />
        ) : (
          <div className="space-y-6">
            {/* Pending Authorization */}
            {pendingChannels.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Pending Authorization ({pendingChannels.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

            {/* No results */}
            {filteredChannels.length === 0 && channels.length > 0 && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No channels match your filters</h3>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search or filter criteria
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default YouTubeChannels;
