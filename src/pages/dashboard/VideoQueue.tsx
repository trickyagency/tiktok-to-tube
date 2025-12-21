import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

const VideoQueue = () => {
  return (
    <DashboardLayout
      title="Video Queue"
      description="Videos scheduled for YouTube upload"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Scheduled Uploads
          </CardTitle>
          <CardDescription>
            Videos waiting to be published to YouTube
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-2">Queue is empty</h3>
            <p className="text-sm text-muted-foreground">
              Add TikTok accounts and set up schedules to populate the queue
            </p>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default VideoQueue;
