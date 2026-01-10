import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Video, Users, AlertTriangle, Settings, XCircle, CheckCircle2, Plus } from 'lucide-react';
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

import { BulkRescrapeButton } from '@/components/tiktok/BulkRescrapeButton';
import { BulkScrapeNewButton } from '@/components/tiktok/BulkScrapeNewButton';
import { SubscriptionStatusBanner } from '@/components/subscriptions/SubscriptionStatusBanner';
import { TikTokFiltersToolbar } from '@/components/tiktok/TikTokFiltersToolbar';
import { TikTokStatsSkeleton, TikTokCardsSkeleton, TikTokTableSkeleton, TikTokFiltersSkeleton } from '@/components/tiktok/TikTokAccountsSkeleton';
import { TikTokEmptyState } from '@/components/tiktok/TikTokEmptyState';

const TikTokAccounts = () => {
  const { isOwner } = useAuth();
  const { data: accounts, isLoading } = useTikTokAccounts();
  const { data: totalVideos } = useScrapedVideosCount();
  const { data: isApifyConfigured, isLoading: isApifyLoading } = useApifyStatus();
  const { data: apifyValidation, isLoading: isValidationLoading } = useApifyValidation();
  const [selectedAccount, setSelectedAccount] = useState<TikTokAccount | null>(null);
  const [videosModalOpen, setVideosModalOpen] = useState(false);
  
  // Filter and view state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('username');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  // Dialog state for empty state callbacks
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  
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

  // Filter accounts based on search, status, and owner filter
  const filteredAccounts = useMemo(() => {
    if (!accounts) return [];
    
    return accounts.filter(account => {
      const ownerEmail = (account as any).owner_email?.toLowerCase() || '';
      
      // Search filter (username, display_name, owner_email)
      const matchesSearch = searchQuery === '' || 
        account.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ownerEmail.includes(searchQuery.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || 
        account.scrape_status === statusFilter ||
        (statusFilter === 'active' && account.account_status === 'active') ||
        (statusFilter === 'private' && account.account_status === 'private') ||
        (statusFilter === 'deleted' && account.account_status === 'deleted');
      
      // Owner filter (only for owners viewing all accounts)
      const matchesOwner = ownerFilter === 'all' || 
        (account as any).owner_email === ownerFilter;
      
      return matchesSearch && matchesStatus && matchesOwner;
    });
  }, [accounts, searchQuery, statusFilter, ownerFilter]);

  // Sort accounts
  const sortedAccounts = useMemo(() => {
    return [...filteredAccounts].sort((a, b) => {
      switch (sortBy) {
        case 'followers':
          return (b.follower_count || 0) - (a.follower_count || 0);
        case 'recent':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case 'lastScraped':
          return new Date(b.last_scraped_at || 0).getTime() - new Date(a.last_scraped_at || 0).getTime();
        default:
          return a.username.localeCompare(b.username);
      }
    });
  }, [filteredAccounts, sortBy]);

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
    setStatusFilter('all');
    setOwnerFilter('all');
  };

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || ownerFilter !== 'all';

  const totalFollowers = accounts?.reduce((sum, a) => sum + (a.follower_count || 0), 0) || 0;

  return (
    <DashboardLayout
      title="TikTok Accounts"
      description="Manage TikTok accounts to scrape content from"
    >
      <div className="space-y-6">
        {/* Subscription Status Banner */}
        <SubscriptionStatusBanner />

        {/* Stats */}
        {isLoading ? (
          <TikTokStatsSkeleton />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{accounts?.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Monitored accounts</p>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Videos Scraped</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Video className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalVideos || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Available in queue</p>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Combined Followers</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalFollowers >= 1000000
                    ? `${(totalFollowers / 1000000).toFixed(1)}M`
                    : totalFollowers >= 1000
                    ? `${(totalFollowers / 1000).toFixed(1)}K`
                    : totalFollowers}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total reach</p>
              </CardContent>
            </Card>
          </div>
        )}

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

        {/* Header with Add Button */}
        <div className="flex flex-wrap justify-between items-center gap-3">
          <h2 className="text-lg font-semibold">Monitored Accounts</h2>
          <div className="flex flex-wrap gap-2">
            
            <BulkScrapeNewButton />
            <BulkRescrapeButton />
            <BulkAccountImport 
              open={bulkImportOpen} 
              onOpenChange={setBulkImportOpen} 
            />
            <AddTikTokAccountDialog 
              open={addDialogOpen} 
              onOpenChange={setAddDialogOpen} 
            />
          </div>
        </div>

        {/* Filters Toolbar */}
        {isLoading ? (
          <TikTokFiltersSkeleton />
        ) : accounts && accounts.length > 0 ? (
          <TikTokFiltersToolbar
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
            totalCount={accounts?.length || 0}
            filteredCount={sortedAccounts.length}
          />
        ) : null}

        {/* Account List */}
        {isLoading ? (
          viewMode === 'table' ? <TikTokTableSkeleton /> : <TikTokCardsSkeleton />
        ) : sortedAccounts.length > 0 ? (
          viewMode === 'table' ? (
            <TikTokAccountsTable
              accounts={sortedAccounts}
              isOwner={isOwner}
              onViewVideos={handleViewVideos}
              onScrape={handleScrape}
              onSyncProfile={handleSyncProfile}
              onDelete={handleDelete}
              isScraping={scrapingAccountId}
              isSyncing={syncingAccountId}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sortedAccounts.map((account) => (
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
          <TikTokEmptyState
            onAddAccount={() => setAddDialogOpen(true)}
            onBulkImport={() => setBulkImportOpen(true)}
            hasFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />
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
