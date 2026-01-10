import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { usePublishQueue } from '@/hooks/usePublishQueue';
import { 
  Loader2, 
  XCircle, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  Upload,
  Download,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadProgressWidgetProps {
  maxFailures?: number;
  showIfEmpty?: boolean;
}

const getPhaseLabel = (phase: string | null, progress: number): string => {
  if (!phase) return 'Preparing...';
  
  switch (phase) {
    case 'downloading':
      return 'Downloading...';
    case 'uploading':
      return 'Uploading to YouTube...';
    case 'finalizing':
      return 'Finalizing...';
    default:
      return progress > 0 ? 'Processing...' : 'Queued';
  }
};

const getPhaseIcon = (phase: string | null) => {
  switch (phase) {
    case 'downloading':
      return <Download className="h-3.5 w-3.5" />;
    case 'uploading':
      return <Upload className="h-3.5 w-3.5" />;
    case 'finalizing':
      return <CheckCircle className="h-3.5 w-3.5" />;
    default:
      return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
  }
};

export const UploadProgressWidget = ({ 
  maxFailures = 5,
  showIfEmpty = false 
}: UploadProgressWidgetProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  
  const { 
    queue,
    retryQueueItem,
    retryAllFailed,
    isRetryingAll
  } = usePublishQueue();

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      await retryQueueItem(id);
    } finally {
      setRetryingId(null);
    }
  };

  // Filter for processing and failed items
  const processingItems = queue.filter(
    item => item.status === 'processing' || item.status === 'uploading'
  );
  const failedItems = queue.filter(item => item.status === 'failed').slice(0, maxFailures);
  
  const hasActivity = processingItems.length > 0 || failedItems.length > 0;

  // Don't render if no activity and showIfEmpty is false
  if (!hasActivity && !showIfEmpty) {
    return null;
  }

  return (
    <Card className="mb-6 border-primary/20">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {processingItems.length > 0 ? (
              <>
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
                <span>Upload Progress</span>
                <span className="text-xs text-muted-foreground font-normal">
                  ({processingItems.length} processing)
                </span>
              </>
            ) : failedItems.length > 0 ? (
              <>
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span>Recent Failures</span>
                <span className="text-xs text-destructive font-normal">
                  ({failedItems.length} failed)
                </span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 text-success" />
                <span>All Uploads Complete</span>
              </>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {failedItems.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => retryAllFailed()}
                disabled={isRetryingAll}
              >
                {isRetryingAll ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                Retry All
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && hasActivity && (
        <CardContent className="pt-0 px-4 pb-4">
          <div className="space-y-3">
            {/* Processing Items */}
            {processingItems.map((item) => (
              <div 
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10"
              >
                {/* Thumbnail */}
                <div className="h-12 w-12 rounded overflow-hidden bg-muted flex-shrink-0">
                  {item.scraped_video?.thumbnail_url ? (
                    <img 
                      src={item.scraped_video.thumbnail_url} 
                      alt="" 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">
                      {item.scraped_video?.title || 'Untitled Video'}
                    </p>
                    <span className={cn(
                      "text-xs flex items-center gap-1 shrink-0",
                      item.progress_phase === 'uploading' && "text-primary",
                      item.progress_phase === 'downloading' && "text-amber-500",
                      item.progress_phase === 'finalizing' && "text-success"
                    )}>
                      {getPhaseIcon(item.progress_phase || null)}
                      {getPhaseLabel(item.progress_phase || null, item.progress_percentage || 0)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={item.progress_percentage || 0} 
                      className="h-1.5 flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-8 text-right">
                      {item.progress_percentage || 0}%
                    </span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground truncate">
                    → {item.youtube_channel?.channel_title || 'Unknown Channel'}
                  </p>
                </div>
              </div>
            ))}

            {/* Failed Items */}
            {failedItems.length > 0 && processingItems.length > 0 && (
              <div className="border-t border-border pt-3 mt-3">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-destructive" />
                  Recent Failures
                </p>
              </div>
            )}
            
            {failedItems.map((item) => (
              <TooltipProvider key={item.id}>
                <div 
                  className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/10"
                >
                  {/* Thumbnail */}
                  <div className="h-10 w-10 rounded overflow-hidden bg-muted flex-shrink-0">
                    {item.scraped_video?.thumbnail_url ? (
                      <img 
                        src={item.scraped_video.thumbnail_url} 
                        alt="" 
                        className="h-full w-full object-cover opacity-60"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <XCircle className="h-4 w-4 text-destructive" />
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.scraped_video?.title || 'Untitled Video'}
                    </p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-xs text-destructive truncate cursor-help">
                          {item.error_message || 'Unknown error'}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p>{item.error_message || 'Unknown error'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  
                  {/* Retry Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0"
                    onClick={() => handleRetry(item.id)}
                    disabled={retryingId === item.id}
                  >
                    {retryingId === item.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </TooltipProvider>
            ))}

            {/* View All Link */}
            {(processingItems.length > 0 || failedItems.length > 0) && (
              <div className="pt-2 text-center">
                <Button variant="link" size="sm" className="text-xs" asChild>
                  <Link to="/dashboard/queue">View Full Queue →</Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      )}
      
      {isExpanded && !hasActivity && showIfEmpty && (
        <CardContent className="pt-0 px-4 pb-4">
          <p className="text-sm text-muted-foreground text-center py-4">
            No uploads in progress. All caught up! 🎉
          </p>
        </CardContent>
      )}
    </Card>
  );
};
