import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { usePublishQueue } from '@/hooks/usePublishQueue';
import { 
  Loader2, 
  ChevronDown, 
  ChevronUp,
  Upload,
  Download,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadProgressWidgetProps {
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
  showIfEmpty = false 
}: UploadProgressWidgetProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const { queue } = usePublishQueue();

  // Filter for processing items only
  const processingItems = queue.filter(
    item => item.status === 'processing' || item.status === 'uploading'
  );
  
  const hasActivity = processingItems.length > 0;

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
            ) : (
              <>
                <CheckCircle className="h-4 w-4 text-success" />
                <span>All Uploads Complete</span>
              </>
            )}
          </CardTitle>
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

            {/* View All Link */}
            {processingItems.length > 0 && (
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
