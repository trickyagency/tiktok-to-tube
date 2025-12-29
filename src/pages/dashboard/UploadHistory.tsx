import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { History, Youtube, Upload, Clock } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useUploadHistory } from '@/hooks/useUploadHistory';
import { useYouTubeChannels } from '@/hooks/useYouTubeChannels';
import UploadHistoryCard from '@/components/history/UploadHistoryCard';

const UploadHistory = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string>('all');
  const { channels, isLoading: channelsLoading } = useYouTubeChannels();
  const { history, channelStats, isLoading: historyLoading } = useUploadHistory(selectedChannelId);

  const isLoading = channelsLoading || historyLoading;

  useEffect(() => {
    document.title = "Upload History | RepostFlow";
  }, []);

  // Get stats for selected channel
  const selectedStats = selectedChannelId !== 'all' && channelStats[selectedChannelId]
    ? channelStats[selectedChannelId]
    : null;

  // Calculate total stats across all channels
  const totalUploads = Object.values(channelStats).reduce((sum, s) => sum + s.totalUploads, 0);

  return (
    <DashboardLayout
      title="Upload History"
      description="Track all your video uploads by channel"
    >
      <div className="space-y-6">
        {/* Channel Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Youtube className="h-5 w-5 text-red-500" />
            <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select a channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                {channels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    <div className="flex items-center gap-2">
                      {channel.channel_thumbnail && (
                        <img
                          src={channel.channel_thumbnail}
                          alt=""
                          className="w-5 h-5 rounded-full"
                        />
                      )}
                      {channel.channel_title || 'Untitled Channel'}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            {totalUploads} total upload{totalUploads !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Channel Stats Card (when specific channel selected) */}
        {selectedStats && selectedChannelId !== 'all' && (
          <Card className="bg-gradient-to-r from-red-500/10 to-transparent border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {selectedStats.channelThumbnail ? (
                  <img
                    src={selectedStats.channelThumbnail}
                    alt=""
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                    <Youtube className="h-6 w-6 text-red-500" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold">{selectedStats.channelTitle}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Upload className="h-3.5 w-3.5" />
                      {selectedStats.totalUploads} videos uploaded
                    </span>
                    {selectedStats.lastUploadAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Last upload {formatDistanceToNow(new Date(selectedStats.lastUploadAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* History List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {selectedChannelId === 'all' ? 'All Uploads' : 'Channel Uploads'}
            </CardTitle>
            <CardDescription>
              {selectedChannelId === 'all' 
                ? 'History of all videos published to YouTube'
                : 'Videos published to this channel'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="w-32 h-20 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-medium mb-2">No uploads yet</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedChannelId === 'all'
                    ? 'Your upload history will appear here once you start publishing'
                    : 'No videos have been uploaded to this channel yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <UploadHistoryCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default UploadHistory;
