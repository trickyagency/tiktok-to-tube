import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Video } from 'lucide-react';

const TikTokAccounts = () => {
  return (
    <DashboardLayout
      title="TikTok Accounts"
      description="Manage TikTok accounts to scrape content from"
    >
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Monitored Accounts
            </CardTitle>
            <CardDescription>
              TikTok accounts being monitored for new videos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Video className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium mb-2">No accounts added</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add a TikTok account to start scraping videos
              </p>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TikTokAccounts;
