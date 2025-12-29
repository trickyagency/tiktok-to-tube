import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  CalendarClock, 
  Loader2, 
  Play, 
  Pause,
  Video,
  ArrowRight
} from 'lucide-react';
import { usePublishSchedules, PublishSchedule } from '@/hooks/usePublishSchedules';
import { ScheduleCard } from '@/components/schedules/ScheduleCard';
import { CreateScheduleDialog } from '@/components/schedules/CreateScheduleDialog';
import { EditScheduleDialog } from '@/components/schedules/EditScheduleDialog';

const Schedules = () => {
  const { schedules, isLoading, toggleSchedule } = usePublishSchedules();
  const [editingSchedule, setEditingSchedule] = useState<PublishSchedule | null>(null);

  useEffect(() => {
    document.title = "Schedules | RepostFlow";
  }, []);

  const activeSchedules = schedules.filter(s => s.is_active);
  const totalVideosPerDay = schedules
    .filter(s => s.is_active)
    .reduce((sum, s) => sum + s.publish_times.length, 0);

  const handlePauseAll = async () => {
    for (const schedule of activeSchedules) {
      await toggleSchedule({ id: schedule.id, is_active: false });
    }
  };

  const handleResumeAll = async () => {
    const pausedSchedules = schedules.filter(s => !s.is_active);
    for (const schedule of pausedSchedules) {
      await toggleSchedule({ id: schedule.id, is_active: true });
    }
  };

  return (
    <DashboardLayout
      title="Publishing Schedules"
      description="Manage your automated TikTok to YouTube publishing schedules"
    >
      <div className="space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Play className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeSchedules.length}</p>
                  <p className="text-sm text-muted-foreground">Active Schedules</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CalendarClock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{schedules.length}</p>
                  <p className="text-sm text-muted-foreground">Total Schedules</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Video className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalVideosPerDay}</p>
                  <p className="text-sm text-muted-foreground">Videos/Day</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Schedules Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                All Schedules
              </CardTitle>
              <CardDescription>
                Configure when and how videos are automatically published
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {schedules.length > 0 && (
                <>
                  {activeSchedules.length > 0 ? (
                    <Button variant="outline" size="sm" onClick={handlePauseAll}>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause All
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={handleResumeAll}>
                      <Play className="h-4 w-4 mr-2" />
                      Resume All
                    </Button>
                  )}
                </>
              )}
              <CreateScheduleDialog />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-12">
                <CalendarClock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-lg mb-2">No schedules yet</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  Create a schedule to automatically upload videos from your TikTok accounts 
                  to YouTube at specific times each day.
                </p>
                <CreateScheduleDialog />
              </div>
            ) : (
              <div className="space-y-4">
                {schedules.map((schedule) => (
                  <ScheduleCard 
                    key={schedule.id} 
                    schedule={schedule} 
                    onEdit={() => setEditingSchedule(schedule)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Link to Video Queue */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">View Publishing Queue</h3>
                  <p className="text-sm text-muted-foreground">
                    See all videos scheduled to be uploaded
                  </p>
                </div>
              </div>
              <Button variant="outline" asChild>
                <Link to="/dashboard/queue">
                  View Queue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Schedule Dialog */}
      <EditScheduleDialog
        schedule={editingSchedule}
        isOpen={!!editingSchedule}
        onClose={() => setEditingSchedule(null)}
      />
    </DashboardLayout>
  );
};

export default Schedules;
