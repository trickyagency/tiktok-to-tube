import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Youtube } from 'lucide-react';

const YouTubeChannels = () => {
  return (
    <DashboardLayout
      title="YouTube Channels"
      description="Connect and manage your YouTube channels"
    >
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Connect Channel
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Youtube className="h-5 w-5" />
              Your Channels
            </CardTitle>
            <CardDescription>
              YouTube channels connected using your own API credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Youtube className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium mb-2">No channels connected</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Connect your YouTube channel to start uploading TikTok videos
              </p>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Channel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default YouTubeChannels;
