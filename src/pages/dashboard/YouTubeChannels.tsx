import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Youtube, CheckCircle2, Clock, AlertCircle, XCircle, TrendingUp, ShieldCheck, Activity, RefreshCw } from 'lucide-react';
import { AddYouTubeChannelDialog } from '@/components/youtube/AddYouTubeChannelDialog';
import { YouTubeChannelCard } from '@/components/youtube/YouTubeChannelCard';
import { YouTubeChannelsTable } from '@/components/youtube/YouTubeChannelsTable';
import { GoogleCloudSetupGuide } from '@/components/youtube/GoogleCloudSetupGuide';
import { YouTubeFiltersToolbar } from '@/components/youtube/YouTubeFiltersToolbar';
import { YouTubeEmptyState } from '@/components/youtube/YouTubeEmptyState';
import { BulkValidateDialog } from '@/components/youtube/BulkValidateDialog';
import { 
  YouTubeStatsSkeleton, 
  YouTubeCardsSkeleton, 
  YouTubeFiltersSkeleton 
} from '@/components/youtube/YouTubeChannelsSkeleton';
import { useYouTubeChannels } from '@/hooks/useYouTubeChannels';
import { useBulkHealthCheck } from '@/hooks/useChannelHealth';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  const [showValidateDialog, setShowValidateDialog] = useState(false);
  
  const { checkAllChannels, isChecking: isBulkChecking, progress } = useBulkHealthCheck();

  useEffect(() => {
    document.title = "YouTube Channels | RepostFlow";
  }, []);

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

  const ownerEmails = useMemo(() => {
    if (!channels || !isOwner) return [];
    const emails = channels.map(c => (c as any).owner_email).filter(Boolean) as string[];
    return [...new Set(emails)];
  }, [channels, isOwner]);

  const stats = useMemo(() => {
    if (!channels) return { total: 0, connected: 0, pending: 0, failed: 0 };
    return {
      total: channels.length,
      connected: channels.filter(c => c.auth_status === 'connected').length,
      pending: channels.filter(c => ['pending', 'authorizing', 'no_channel'].includes(c.auth_status || '')).length,
      failed: channels.filter(c => ['failed', 'token_revoked'].includes(c.auth_status || '')).length,
    };
  }, [channels]);

  const filteredChannels = useMemo(() => {
    if (!channels) return [];
    
    let result = channels.filter(channel => {
      const ownerEmail = (channel as any).owner_email?.toLowerCase() || '';
      
      const matchesSearch = searchQuery === '' || 
        channel.channel_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ownerEmail.includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
        channel.auth_status === statusFilter ||
        (statusFilter === 'pending' && ['pending', 'authorizing', 'no_channel'].includes(channel.auth_status || '')) ||
        (statusFilter === 'failed' && ['failed', 'token_revoked'].includes(channel.auth_status || ''));
      
      const matchesOwner = ownerFilter === 'all' || 
        (channel as any).owner_email === ownerFilter;
      
      return matchesSearch && matchesStatus && matchesOwner;
    });

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

  const handleBulkHealthCheck = async () => {
    const connectedChannelIds = channels
      .filter(c => c.auth_status === 'connected')
      .map(c => c.id);
      
    if (connectedChannelIds.length === 0) {
      toast.info('No connected channels to check');
      return;
    }
    
    try {
      const results = await checkAllChannels(connectedChannelIds);
      const successCount = results.filter(r => r.success).length;
      toast.success(`Health check completed: ${successCount}/${connectedChannelIds.length} channels healthy`);
      refetch();
    } catch (error) {
      console.error('Bulk health check failed:', error);
      toast.error('Bulk health check failed');
    }
  };

  const connectedChannels = filteredChannels.filter(c => c.auth_status === 'connected');
  const pendingChannels = filteredChannels.filter(c => 
    ['pending', 'authorizing', 'no_channel'].includes(c.auth_status || '')
  );
  const failedChannels = filteredChannels.filter(c => 
    ['failed', 'token_revoked'].includes(c.auth_status || '')
  );

  // Stats card data
  const statsCards = [
    {
      title: 'Total Channels',
      value: stats.total,
      subtitle: 'YouTube channels',
      icon: Youtube,
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-500',
      gradient: 'from-red-500/5 to-transparent',
      borderColor: 'hover:border-red-500/30'
    },
    {
      title: 'Connected',
      value: stats.connected,
      subtitle: 'Ready to upload',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
      valueColor: 'text-emerald-600',
      gradient: 'from-emerald-500/5 to-transparent',
      borderColor: 'hover:border-emerald-500/30'
    },
    {
      title: 'Pending',
      value: stats.pending,
      subtitle: 'Need authorization',
      icon: Clock,
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
      valueColor: 'text-amber-600',
      gradient: 'from-amber-500/5 to-transparent',
      borderColor: 'hover:border-amber-500/30'
    },
    {
      title: 'Failed',
      value: stats.failed,
      subtitle: 'Need attention',
      icon: XCircle,
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-500',
      valueColor: 'text-red-600',
      gradient: 'from-red-500/5 to-transparent',
      borderColor: 'hover:border-red-500/30'
    }
  ];

  return (
    <DashboardLayout
      title="YouTube Channels"
      description="Connect and manage your YouTube channels with per-channel OAuth credentials"
    >
      <div className="space-y-6">
        {/* Setup Guide */}
        <GoogleCloudSetupGuide />

        {/* Premium Stats Cards */}
        {isLoading ? (
          <YouTubeStatsSkeleton />
        ) : channels.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statsCards.map((stat, index) => (
              <Card 
                key={stat.title}
                className={cn(
                  "relative overflow-hidden group",
                  "bg-card/80 backdrop-blur-xl",
                  "border border-border/50",
                  "shadow-lg shadow-black/5",
                  "hover:shadow-xl hover:-translate-y-0.5",
                  "transition-all duration-300 ease-out",
                  stat.borderColor
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Background gradient */}
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", stat.gradient)} />
                
                {/* Top gradient line */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                
                <CardHeader className="relative flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                    stat.iconBg
                  )}>
                    <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className={cn(
                    "text-3xl font-bold tracking-tight",
                    stat.valueColor || "text-foreground"
                  )}>
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    {stat.subtitle}
                  </p>
                </CardContent>
              </Card>
            ))}
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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkHealthCheck}
                disabled={isBulkChecking || channels.filter(c => c.auth_status === 'connected').length === 0}
                className="gap-2"
              >
                {isBulkChecking ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Checking ({progress.current}/{progress.total})
                  </>
                ) : (
                  <>
                    <Activity className="h-4 w-4" />
                    Check All Health
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowValidateDialog(true)}
                className="gap-2"
              >
                <ShieldCheck className="h-4 w-4" />
                Validate All
              </Button>
              <AddYouTubeChannelDialog onSuccess={refetch} />
            </div>
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
          <div className="space-y-8">
            {/* Pending Authorization */}
            {pendingChannels.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Pending Authorization</h2>
                    <p className="text-sm text-muted-foreground">{pendingChannels.length} channel{pendingChannels.length !== 1 ? 's' : ''} need{pendingChannels.length === 1 ? 's' : ''} attention</p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pendingChannels.map((channel, index) => (
                    <div 
                      key={channel.id} 
                      className="animate-in fade-in slide-in-from-bottom-4"
                      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                    >
                      <YouTubeChannelCard 
                        channel={channel} 
                        onAuthComplete={refetch}
                        index={index}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Failed Channels */}
            {failedChannels.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <XCircle className="h-4 w-4 text-red-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Failed Channels</h2>
                    <p className="text-sm text-muted-foreground">{failedChannels.length} channel{failedChannels.length !== 1 ? 's' : ''} need{failedChannels.length === 1 ? 's' : ''} reconnection</p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {failedChannels.map((channel, index) => (
                    <div 
                      key={channel.id} 
                      className="animate-in fade-in slide-in-from-bottom-4"
                      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                    >
                      <YouTubeChannelCard 
                        channel={channel} 
                        onAuthComplete={refetch}
                        index={pendingChannels.length + index}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Connected Channels */}
            {connectedChannels.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Connected Channels</h2>
                    <p className="text-sm text-muted-foreground">{connectedChannels.length} channel{connectedChannels.length !== 1 ? 's' : ''} ready to upload</p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {connectedChannels.map((channel, index) => (
                    <div 
                      key={channel.id}
                      className="animate-in fade-in slide-in-from-bottom-4"
                      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                    >
                      <YouTubeChannelCard 
                        channel={channel}
                        onAuthComplete={refetch}
                        index={pendingChannels.length + failedChannels.length + index}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No results state */}
            {filteredChannels.length === 0 && channels.length > 0 && (
              <Card className="border-dashed bg-card/50 backdrop-blur-sm">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <AlertCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">No channels match your filters</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm">
                    Try adjusting your search query or filter criteria to find what you're looking for
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Bulk Validate Dialog */}
        <BulkValidateDialog
          open={showValidateDialog}
          onOpenChange={setShowValidateDialog}
          channelCount={channels.length}
          onComplete={refetch}
          onReauthorize={handleReauthorize}
        />
      </div>
    </DashboardLayout>
  );
};

export default YouTubeChannels;
