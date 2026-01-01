import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Video, Users, Loader2, AlertTriangle, Settings, XCircle, CheckCircle2, Search, X, LayoutGrid, Table2 } from 'lucide-react';
import { useTikTokAccounts, TikTokAccount, TikTokAccountWithOwner, useScrapeVideos, useRefreshTikTokAccount, useDeleteTikTokAccount } from '@/hooks/useTikTokAccounts';
import { useTikTokAccountsRealtime } from '@/hooks/useTikTokAccountsRealtime';
import { useScrapedVideosCount } from '@/hooks/useScrapedVideos';
import { useApifyStatus, useApifyValidation } from '@/hooks/useApifyStatus';
import { useAuth } from '@/contexts/AuthContext';
import { AddTikTokAccountDialog } from '@/components/tiktok/AddTikTokAccountDialog';
import { TikTokAccountCard } from '@/components/tiktok/TikTokAccountCard';
import { TikTokAccountsTable } from '@/components/tiktok/TikTokAccountsTable';
import { AccountVideosModal } from '@/components/tiktok/AccountVideosModal';
import { BulkAccountImport } from '@/components/tiktok/BulkAccountImport';
import { ScrapeQueueProgress } from '@/components/tiktok/ScrapeQueueProgress';
import { SubscriptionStatusBanner } from '@/components/subscriptions/SubscriptionStatusBanner';

const TikTokAccounts = () => {
  const { isOwner } = useAuth();
  const { data: accounts, isLoading } = useTikTokAccounts();
  const { data: totalVideos } = useScrapedVideosCount();
  const { data: isApifyConfigured, isLoading: isApifyLoading } = useApifyStatus();
  const { data: apifyValidation, isLoading: isValidationLoading } = useApifyValidation();
  const [selectedAccount, setSelectedAccount] = useState<TikTokAccount | null>(null);
  const [videosModalOpen, setVideosModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  // Action hooks for table view
  const scrapeVideos = useScrapeVideos();
  const refreshAccount = useRefreshTikTokAccount();
  const deleteAccount = useDeleteTikTokAccount();
  const [scrapingAccountId, setScrapingAccountId] = useState<string | null>(null);
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "TikTok Accounts | RepostFlow";
  }, []);

  // Determine the effective Apify status for disabling actions
  const isApifyUsable = isApifyConfigured && apifyValidation?.valid;

  // Enable realtime updates
  useTikTokAccountsRealtime();

  // Get unique owner emails for filter dropdown (only for owners)
  const ownerEmails = useMemo(() => {
    if (!accounts || !isOwner) return [];
    const emails = accounts.map(a => (a as any).owner_email).filter(Boolean) as string[];
    return [...new Set(emails)];
  }, [accounts, isOwner]);

  // Filter accounts based on search and owner filter
  const filteredAccounts = useMemo(() => {
    if (!accounts) return [];
    
    return accounts.filter(account => {
      const ownerEmail = (account as any).owner_email?.toLowerCase() || '';
      
      // Search filter (username, display_name, owner_email)
      const matchesSearch = searchQuery === '' || 
        account.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ownerEmail.includes(searchQuery.toLowerCase());
      
      // Owner filter (only for owners viewing all accounts)
      const matchesOwner = ownerFilter === 'all' || 
        (account as any).owner_email === ownerFilter;
      
      return matchesSearch && matchesOwner;
    });
  }, [accounts, searchQuery, ownerFilter]);

  const handleViewVideos = (account: TikTokAccount | TikTokAccountWithOwner) => {
    setSelectedAccount(account as TikTokAccount);
    setVideosModalOpen(true);
  };

  const handleScrape = async (accountId: string) => {
    const account = accounts?.find(a => a.id === accountId);
    if (!account) return;
    setScrapingAccountId(accountId);
    try {
      await scrapeVideos.mutateAsync({ accountId, username: account.username });
    } finally {
      setScrapingAccountId(null);
    }
  };

  const handleSyncProfile = async (accountId: string) => {
    const account = accounts?.find(a => a.id === accountId);
    if (!account) return;
    setSyncingAccountId(accountId);
    try {
      await refreshAccount.mutateAsync({ accountId, username: account.username });
    } finally {
      setSyncingAccountId(null);
    }
  };

  const handleDelete = (accountId: string) => {
    deleteAccount.mutate(accountId);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setOwnerFilter('all');
  };

  const hasActiveFilters = searchQuery !== '' || ownerFilter !== 'all';

  const totalFollowers = accounts?.reduce((sum, a) => sum + a.follower_count, 0) || 0;
  const scrapingAccounts = accounts?.filter(a => a.scrape_status === 'scraping') || [];

  return (
    <DashboardLayout
      title="TikTok Accounts"
      description="Manage TikTok accounts to scrape content from"
    >
      <div className="space-y-6">
        {/* Subscription Status Banner */}
        <SubscriptionStatusBanner />

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{accounts?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Videos Scraped</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalVideos || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Combined Followers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalFollowers >= 1000000
                  ? `${(totalFollowers / 1000000).toFixed(1)}M`
                  : totalFollowers >= 1000
                  ? `${(totalFollowers / 1000).toFixed(1)}K`
                  : totalFollowers}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Apify Status Banner */}
        {!isApifyLoading && !isValidationLoading && (
          <>
            {/* Not Configured */}
            {!isApifyConfigured && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between gap-4">
                  <span>
                    <strong>Scraper API key not configured.</strong> Video scraping is disabled. 
                    The platform owner must configure the API key in Settings.
                  </span>
                  <Button variant="outline" size="sm" asChild className="shrink-0">
                    <Link to="/dashboard/settings">
                      <Settings className="h-4 w-4 mr-2" />
                      Go to Settings
                    </Link>
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            
            {/* Configured but Invalid/Expired */}
            {isApifyConfigured && apifyValidation && !apifyValidation.valid && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between gap-4">
                  <span>
                    <strong>
                      {apifyValidation.status === 'expired' 
                        ? 'Scraper subscription expired.' 
                        : apifyValidation.status === 'invalid'
                        ? 'Invalid scraper API key.'
                        : 'Scraper API key error.'}
                    </strong>{' '}
                    {apifyValidation.message}. Video scraping is disabled.
                  </span>
                  <Button variant="outline" size="sm" asChild className="shrink-0">
                    <Link to="/dashboard/settings">
                      <Settings className="h-4 w-4 mr-2" />
                      Update API Key
                    </Link>
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            
            {/* Valid - show success indicator */}
            {isApifyConfigured && apifyValidation?.valid && (
              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-700 dark:text-green-300">
                  <strong>Repostflow Connected.</strong> Database Creation is ready to use.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}


        {/* Scrape Queue Progress */}
        <ScrapeQueueProgress />

        {/* Header with Add Button and View Toggle */}
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Monitored Accounts</h2>
            {/* View Toggle */}
            {filteredAccounts.length > 0 && (
              <div className="flex items-center gap-1 border rounded-md p-1">
                <Button
                  variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setViewMode('cards')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setViewMode('table')}
                >
                  <Table2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <BulkAccountImport />
            <AddTikTokAccountDialog />
          </div>
        </div>

        {/* Search and Filter (for owners) */}
        {isOwner && accounts && accounts.length > 0 && (
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username, name, or owner email..."
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
                Showing {filteredAccounts.length} of {accounts.length}
              </span>
            )}
          </div>
        )}

        {/* Account List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredAccounts.length > 0 ? (
          viewMode === 'table' ? (
            <TikTokAccountsTable
              accounts={filteredAccounts}
              isOwner={isOwner}
              onViewVideos={handleViewVideos}
              onScrape={handleScrape}
              onSyncProfile={handleSyncProfile}
              onDelete={handleDelete}
              isScraping={scrapingAccountId}
              isSyncing={syncingAccountId}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredAccounts.map((account) => (
                <TikTokAccountCard
                  key={account.id}
                  account={account}
                  onViewVideos={handleViewVideos}
                  isApifyConfigured={isApifyUsable ?? false}
                />
              ))}
            </div>
          )
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Video className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium mb-2">No accounts added</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add a TikTok account to start scraping videos
              </p>
              <AddTikTokAccountDialog />
            </CardContent>
          </Card>
        )}
      </div>

      <AccountVideosModal
        account={selectedAccount}
        open={videosModalOpen}
        onOpenChange={setVideosModalOpen}
      />
    </DashboardLayout>
  );
};

export default TikTokAccounts;
