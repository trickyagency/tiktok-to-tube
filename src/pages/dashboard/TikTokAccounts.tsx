import { useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Video, Users, Loader2, AlertTriangle, Settings, XCircle, CheckCircle2 } from 'lucide-react';
import { useTikTokAccounts, TikTokAccount } from '@/hooks/useTikTokAccounts';
import { useTikTokAccountsRealtime } from '@/hooks/useTikTokAccountsRealtime';
import { useScrapedVideosCount } from '@/hooks/useScrapedVideos';
import { useApifyStatus, useApifyValidation } from '@/hooks/useApifyStatus';
import { AddTikTokAccountDialog } from '@/components/tiktok/AddTikTokAccountDialog';
import { TikTokAccountCard } from '@/components/tiktok/TikTokAccountCard';
import { AccountVideosModal } from '@/components/tiktok/AccountVideosModal';
import { BulkAccountImport } from '@/components/tiktok/BulkAccountImport';
import { ScrapeQueueProgress } from '@/components/tiktok/ScrapeQueueProgress';
import { ScrapeAllAccountsButton } from '@/components/tiktok/ScrapeAllAccountsButton';
import { SubscriptionStatusBanner } from '@/components/subscriptions/SubscriptionStatusBanner';

const TikTokAccounts = () => {
  const { data: accounts, isLoading } = useTikTokAccounts();
  const { data: totalVideos } = useScrapedVideosCount();
  const { data: isApifyConfigured, isLoading: isApifyLoading } = useApifyStatus();
  const { data: apifyValidation, isLoading: isValidationLoading } = useApifyValidation();
  const [selectedAccount, setSelectedAccount] = useState<TikTokAccount | null>(null);
  const [videosModalOpen, setVideosModalOpen] = useState(false);

  // Determine the effective Apify status for disabling actions
  const isApifyUsable = isApifyConfigured && apifyValidation?.valid;

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
            
            {/* Configured but Invalid/Expired */}
            {isApifyConfigured && apifyValidation && !apifyValidation.valid && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between gap-4">
                  <span>
                    <strong>
                      {apifyValidation.status === 'expired' 
                        ? 'Apify subscription expired.' 
                        : apifyValidation.status === 'invalid'
                        ? 'Invalid Apify API key.'
                        : 'Apify API key error.'}
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
                  <strong>Apify connected.</strong> Video scraping is ready to use.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}


        {/* Scrape Queue Progress */}
        <ScrapeQueueProgress />

        {/* Header with Add Button */}
        <div className="flex flex-wrap justify-between items-center gap-2">
          <h2 className="text-lg font-semibold">Monitored Accounts</h2>
          <div className="flex flex-wrap gap-2">
            <ScrapeAllAccountsButton disabled={!isApifyUsable} />
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
                isApifyConfigured={isApifyUsable ?? false}
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
