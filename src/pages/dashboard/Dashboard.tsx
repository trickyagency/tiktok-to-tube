import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Youtube, Video, Calendar, TrendingUp } from 'lucide-react';

const stats = [
  { title: 'YouTube Channels', value: '0', icon: Youtube, description: 'Connected channels' },
  { title: 'TikTok Accounts', value: '0', icon: Video, description: 'Monitored accounts' },
  { title: 'Videos Queued', value: '0', icon: Calendar, description: 'Pending uploads' },
  { title: 'Videos Published', value: '0', icon: TrendingUp, description: 'Total uploads' },
];

const Dashboard = () => {
  return (
    <DashboardLayout
      title="Dashboard"
      description="Overview of your TikTok to YouTube automation"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Complete these steps to start repurposing content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">1</div>
              <div>
                <p className="font-medium">Connect YouTube Channel</p>
                <p className="text-sm text-muted-foreground">Add your YouTube API credentials</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">2</div>
              <div>
                <p className="font-medium">Add TikTok Account</p>
                <p className="text-sm text-muted-foreground">Enter a TikTok username to monitor</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">3</div>
              <div>
                <p className="font-medium">Set Up Schedule</p>
                <p className="text-sm text-muted-foreground">Configure automatic publishing times</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest uploads and actions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-8">
              No activity yet. Connect your accounts to get started.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
