import { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, CheckCircle, Clock, Loader2, XCircle, Upload, RotateCcw, Filter, AlertTriangle } from 'lucide-react';
import { usePublishQueue, QueueItemWithDetails } from '@/hooks/usePublishQueue';
import { QueueVideoCard } from '@/components/queue/QueueVideoCard';
import { CreateScheduleDialog } from '@/components/schedules/CreateScheduleDialog';
import { ScheduleCard } from '@/components/schedules/ScheduleCard';
import { usePublishSchedules } from '@/hooks/usePublishSchedules';
import { TestUploadDialog } from '@/components/queue/TestUploadDialog';
import { ProcessQueueButton } from '@/components/queue/ProcessQueueButton';
import { useTikTokAccounts } from '@/hooks/useTikTokAccounts';

const VideoQueue = () => {
  const [filterAccountId, setFilterAccountId] = useState<string>('all');
  const [showOnlyMismatched, setShowOnlyMismatched] = useState(false);
  
  const { 
    queue, 
    queuedItems, 
    processingItems, 
    publishedItems, 
    failedItems,
    isLoading: isLoadingQueue,
    refetch: refetchQueue,
    retryAllFailed,
    isRetryingAll
  } = usePublishQueue();
  
  const { schedules, isLoading: isLoadingSchedules, refetch: refetchSchedules } = usePublishSchedules();
  const { data: tikTokAccounts = [] } = useTikTokAccounts();

  const isLoading = isLoadingQueue || isLoadingSchedules;

  // Filter function for queue items by TikTok account and mismatch status
  const filterByAccount = (items: QueueItemWithDetails[]) => {
    let filtered = items;
    
    if (filterAccountId !== 'all') {
      filtered = filtered.filter(item => item.scraped_video?.tiktok_account_id === filterAccountId);
    }
    
    if (showOnlyMismatched) {
      filtered = filtered.filter(item => 
        item.youtube_channel?.tiktok_account_id && 
        item.scraped_video?.tiktok_account_id !== item.youtube_channel?.tiktok_account_id
      );
    }
    
    return filtered;
  };

  const filteredQueuedItems = filterByAccount(queuedItems);
  const filteredProcessingItems = filterByAccount(processingItems);
  const filteredPublishedItems = filterByAccount(publishedItems);
  const filteredFailedItems = filterByAccount(failedItems);

  return (
    <DashboardLayout
      title="Video Queue"
      description="Manage your video publishing schedule"
    >
      <div className="space-y-6">
        {/* Processing Banner */}
        {processingItems.length > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="h-5 w-5 text-primary animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    {processingItems.length} video{processingItems.length > 1 ? 's' : ''} currently uploading
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {processingItems[0]?.scraped_video?.title || 'Processing video...'} 
                    {processingItems[0]?.progress_phase && ` - ${processingItems[0].progress_phase}`}
                  </p>
                </div>
                <div className="w-32">
                  <Progress 
                    value={processingItems[0]?.progress_percentage || 0} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {processingItems[0]?.progress_percentage || 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Schedules Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upload Schedules
              </CardTitle>
              <CardDescription>
                Automated TikTok to YouTube publishing schedules
              </CardDescription>
            </div>
            <CreateScheduleDialog />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <h3 className="font-medium mb-1">No schedules yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a schedule to automatically upload videos
                </p>
                <CreateScheduleDialog />
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map((schedule) => (
                  <ScheduleCard key={schedule.id} schedule={schedule} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Queue Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Publishing Queue
              </CardTitle>
              <CardDescription>
                Videos waiting to be published to YouTube
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <TestUploadDialog onSuccess={refetchQueue} />
              <ProcessQueueButton onComplete={refetchQueue} />
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
              {/* TikTok Account Filter */}
              {tikTokAccounts.length > 0 && (
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={filterAccountId} onValueChange={setFilterAccountId}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by TikTok" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All TikTok Accounts</SelectItem>
                      {tikTokAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          @{account.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {filterAccountId !== 'all' && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setFilterAccountId('all')}
                      className="text-xs"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              )}
              
              {/* Mismatch Filter */}
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="mismatch-filter"
                  checked={showOnlyMismatched}
                  onCheckedChange={(checked) => setShowOnlyMismatched(checked === true)}
                />
                <label 
                  htmlFor="mismatch-filter" 
                  className="text-sm flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  Show only mismatched
                </label>
              </div>
            </div>
            
            <Tabs defaultValue="queued" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="queued" className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Queued ({filteredQueuedItems.length})
                </TabsTrigger>
                <TabsTrigger value="processing" className="flex items-center gap-1">
                  <Loader2 className="h-3.5 w-3.5" />
                  Processing ({filteredProcessingItems.length})
                </TabsTrigger>
                <TabsTrigger value="published" className="flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Published ({filteredPublishedItems.length})
                </TabsTrigger>
                <TabsTrigger value="failed" className="flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5" />
                  Failed ({filteredFailedItems.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="queued">
                {filteredQueuedItems.length === 0 ? (
                  <EmptyState message={filterAccountId !== 'all' ? "No queued videos from this account" : "No videos queued for upload"} />
                ) : (
                  <div className="space-y-3">
                    {filteredQueuedItems.map((item) => (
                      <QueueVideoCard key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="processing">
                {filteredProcessingItems.length === 0 ? (
                  <EmptyState message={filterAccountId !== 'all' ? "No processing videos from this account" : "No videos currently processing"} />
                ) : (
                  <div className="space-y-3">
                    {filteredProcessingItems.map((item) => (
                      <QueueVideoCard key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="published">
                {filteredPublishedItems.length === 0 ? (
                  <EmptyState message={filterAccountId !== 'all' ? "No published videos from this account" : "No published uploads yet"} />
                ) : (
                  <div className="space-y-3">
                    {filteredPublishedItems.map((item) => (
                      <QueueVideoCard key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="failed">
                {filteredFailedItems.length === 0 ? (
                  <EmptyState message={filterAccountId !== 'all' ? "No failed videos from this account" : "No failed uploads"} />
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retryAllFailed()}
                        disabled={isRetryingAll || failedItems.length === 0}
                      >
                        {isRetryingAll ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4 mr-2" />
                        )}
                        Retry All ({failedItems.length})
                      </Button>
                    </div>
                    {filteredFailedItems.map((item) => (
                      <QueueVideoCard key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8">
      <Calendar className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export default VideoQueue;
