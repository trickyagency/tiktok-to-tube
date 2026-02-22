import { useMissedUploads } from '@/hooks/useMissedUploads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Clock, Youtube } from 'lucide-react';
import { format } from 'date-fns';

export function MissedUploadsWidget() {
  const { data: missedUploads = [], isLoading } = useMissedUploads();

  if (isLoading || missedUploads.length === 0) return null;

  return (
    <Card className="mb-6 border-amber-500/50 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <span className="text-amber-600 dark:text-amber-400">
            Missed Uploads ({missedUploads.length})
          </span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Schedules that missed their publish time in the last 24 hours
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {missedUploads.map((missed, index) => (
            <div
              key={`${missed.scheduleId}-${missed.expectedTime}-${index}`}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20"
            >
              <Clock className="h-4 w-4 text-amber-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {missed.scheduleName}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>Expected: {missed.expectedTime} ({missed.timezone})</span>
                  <span>·</span>
                  <span>{format(missed.expectedAt, 'MMM d, h:mm a')}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  {missed.tiktokUsername && (
                    <span>@{missed.tiktokUsername}</span>
                  )}
                  {missed.youtubeChannelTitle && (
                    <>
                      <span>→</span>
                      <span className="flex items-center gap-1">
                        <Youtube className="h-3 w-3" />
                        {missed.youtubeChannelTitle}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
