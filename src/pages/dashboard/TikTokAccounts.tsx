import { useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Video, Users, Loader2, Info, AlertTriangle, Settings, RefreshCw } from 'lucide-react';
import { useTikTokAccounts, useBulkSyncProfiles, TikTokAccount } from '@/hooks/useTikTokAccounts';
import { useTikTokAccountsRealtime } from '@/hooks/useTikTokAccountsRealtime';
import { useScrapedVideosCount } from '@/hooks/useScrapedVideos';
import { useApifyStatus } from '@/hooks/useApifyStatus';
import { AddTikTokAccountDialog } from '@/components/tiktok/AddTikTokAccountDialog';
import { TikTokAccountCard } from '@/components/tiktok/TikTokAccountCard';
import { AccountVideosModal } from '@/components/tiktok/AccountVideosModal';
import { ManualVideoImport } from '@/components/tiktok/ManualVideoImport';
import { BulkAccountImport } from '@/components/tiktok/BulkAccountImport';

const TikTokAccounts = () => {
  const { data: accounts, isLoading } = useTikTokAccounts();
  const { data: totalVideos } = useScrapedVideosCount();
  const { data: isApifyConfigured, isLoading: isApifyLoading } = useApifyStatus();
  const bulkSync = useBulkSyncProfiles();
  const [selectedAccount, setSelectedAccount] = useState<TikTokAccount | null>(null);
  const [videosModalOpen, setVideosModalOpen] = useState(false);

  // Enable realtime updates
  useTikTokAccountsRealtime();

  const handleViewVideos = (account: TikTokAccount) => {
    setSelectedAccount(account);
    setVideosModalOpen(true);
  };

  const totalFollowers = accounts?.reduce((sum, a) => sum + a.follower_count, 0) || 0;
  const scrapingAccounts = accounts?.filter(a => a.scrape_status === 'scraping') || [];

  return (
    <DashboardLayout
      title="TikTok Accounts"
      description="Manage TikTok accounts to scrape content from"
    >
      <div className="space-y-6">
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

        {/* Apify Warning Banner */}
        {!isApifyLoading && !isApifyConfigured && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>
                <strong>Apify API key not configured.</strong> Video scraping is disabled. 
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


        {/* Header with Add Button */}
        <div className="flex flex-wrap justify-between items-center gap-2">
          <h2 className="text-lg font-semibold">Monitored Accounts</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => accounts && bulkSync.mutate(accounts)}
              disabled={!accounts || accounts.length === 0 || bulkSync.isPending}
            >
              {bulkSync.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync All Profiles
            </Button>
            <ManualVideoImport />
            <BulkAccountImport />
            <AddTikTokAccountDialog />
          </div>
        </div>

        {/* Account List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : accounts && accounts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {accounts.map((account) => (
              <TikTokAccountCard
                key={account.id}
                account={account}
                onViewVideos={handleViewVideos}
                isApifyConfigured={isApifyConfigured ?? false}
              />
            ))}
          </div>
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
