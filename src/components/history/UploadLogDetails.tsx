import { useState } from "react";
import { format } from "date-fns";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  Clock, 
  Download, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  ExternalLink,
  HardDrive
} from "lucide-react";
import { useUploadLogs, UploadLog } from "@/hooks/useUploadLogs";

interface UploadLogDetailsProps {
  queueItemId: string;
  trigger?: React.ReactNode;
}

function formatDuration(ms: number | null): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: UploadLog['status'] }) {
  switch (status) {
    case 'success':
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Success
        </Badge>
      );
    case 'failed':
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    case 'in_progress':
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          In Progress
        </Badge>
      );
  }
}

function LogEntry({ log }: { log: UploadLog }) {
  return (
    <Card className="bg-muted/30 border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Attempt #{log.attempt_number}</span>
            <StatusBadge status={log.status} />
          </div>
          <span className="text-xs text-muted-foreground">
            {format(new Date(log.started_at), 'MMM d, yyyy HH:mm:ss')}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phase Timings */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Download className="h-4 w-4 text-blue-400" />
            <div>
              <p className="text-muted-foreground text-xs">Download</p>
              <p className="font-medium">{formatDuration(log.download_duration_ms)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Upload className="h-4 w-4 text-green-400" />
            <div>
              <p className="text-muted-foreground text-xs">Upload</p>
              <p className="font-medium">{formatDuration(log.upload_duration_ms)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-purple-400" />
            <div>
              <p className="text-muted-foreground text-xs">Total</p>
              <p className="font-medium">{formatDuration(log.total_duration_ms)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <HardDrive className="h-4 w-4 text-orange-400" />
            <div>
              <p className="text-muted-foreground text-xs">Size</p>
              <p className="font-medium">{formatBytes(log.video_size_bytes)}</p>
            </div>
          </div>
        </div>

        {/* Error Info */}
        {log.status === 'failed' && log.error_message && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3">
            <p className="text-xs text-red-400 mb-1">
              Failed at phase: <span className="font-medium">{log.error_phase || 'unknown'}</span>
            </p>
            <p className="text-sm text-red-300">{log.error_message}</p>
          </div>
        )}

        {/* YouTube Link */}
        {log.youtube_video_url && (
          <a 
            href={log.youtube_video_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            View on YouTube
          </a>
        )}
      </CardContent>
    </Card>
  );
}

export function UploadLogDetails({ queueItemId, trigger }: UploadLogDetailsProps) {
  const [open, setOpen] = useState(false);
  const { data: logs, isLoading } = useUploadLogs(open ? queueItemId : undefined);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <FileText className="h-4 w-4 mr-1" />
            View Logs
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload Logs
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : logs && logs.length > 0 ? (
            logs.map((log) => <LogEntry key={log.id} log={log} />)
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No upload logs found for this item</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
