import { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video, Users, Loader2 } from 'lucide-react';
import { useTikTokAccounts, TikTokAccount } from '@/hooks/useTikTokAccounts';
import { useScrapedVideosCount } from '@/hooks/useScrapedVideos';
import { AddTikTokAccountDialog } from '@/components/tiktok/AddTikTokAccountDialog';
import { TikTokAccountCard } from '@/components/tiktok/TikTokAccountCard';
import { AccountVideosModal } from '@/components/tiktok/AccountVideosModal';
import { ManualVideoImport } from '@/components/tiktok/ManualVideoImport';

const TikTokAccounts = () => {
  const { data: accounts, isLoading } = useTikTokAccounts();
  const { data: totalVideos } = useScrapedVideosCount();
  const [selectedAccount, setSelectedAccount] = useState<TikTokAccount | null>(null);
  const [videosModalOpen, setVideosModalOpen] = useState(false);

  const handleViewVideos = (account: TikTokAccount) => {
    setSelectedAccount(account);
    setVideosModalOpen(true);
  };

  const totalFollowers = accounts?.reduce((sum, a) => sum + a.follower_count, 0) || 0;

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

        {/* Header with Add Button */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Monitored Accounts</h2>
          <div className="flex gap-2">
            <ManualVideoImport />
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
