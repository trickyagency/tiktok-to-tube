import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { History } from 'lucide-react';

const UploadHistory = () => {
  return (
    <DashboardLayout
      title="Upload History"
      description="Track all your video uploads"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Uploads
          </CardTitle>
          <CardDescription>
            History of videos published to YouTube
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-2">No uploads yet</h3>
            <p className="text-sm text-muted-foreground">
              Your upload history will appear here once you start publishing
            </p>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default UploadHistory;
