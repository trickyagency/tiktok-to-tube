import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ExternalLink,
  KeyRound,
} from 'lucide-react';
import { useYouTubeBulkValidate, ValidationResult, ValidationStatus } from '@/hooks/useYouTubeBulkValidate';
import { cn } from '@/lib/utils';

interface BulkValidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelCount: number;
  onComplete?: () => void;
  onReauthorize?: (channelId: string) => void;
}

const statusConfig: Record<ValidationStatus, { 
  label: string; 
  icon: typeof CheckCircle2; 
  color: string;
  bgColor: string;
}> = {
  valid: {
    label: 'Valid',
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10',
  },
  token_revoked: {
    label: 'Token Revoked',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
  },
  api_not_enabled: {
    label: 'API Not Enabled',
    icon: AlertTriangle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
  },
  credentials_invalid: {
    label: 'Invalid Credentials',
    icon: KeyRound,
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
  },
  no_refresh_token: {
    label: 'No Token',
    icon: AlertTriangle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
  },
  error: {
    label: 'Error',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
  },
  pending: {
    label: 'Pending',
    icon: Loader2,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
};

export function BulkValidateDialog({
  open,
  onOpenChange,
  channelCount,
  onComplete,
  onReauthorize,
}: BulkValidateDialogProps) {
  const {
    validateAll,
    isValidating,
    results,
    groupedResults,
    summary,
    error,
    reset,
  } = useYouTubeBulkValidate();

  const [hasStarted, setHasStarted] = useState(false);

  const handleStart = async () => {
    setHasStarted(true);
    try {
      await validateAll();
      onComplete?.();
    } catch (err) {
      console.error('Validation error:', err);
    }
  };

  const handleClose = () => {
    reset();
    setHasStarted(false);
    onOpenChange(false);
  };

  const issueResults = results.filter(r => r.status !== 'valid');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            Validate Channel Authorizations
          </DialogTitle>
          <DialogDescription>
            Check all YouTube channels for authorization issues
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Pre-validation state */}
          {!hasStarted && (
            <div className="space-y-4">
              <Card className="border-dashed">
                <CardContent className="pt-6">
                  <div className="text-center space-y-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                      <ShieldCheck className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        This will validate <span className="font-medium text-foreground">{channelCount}</span> YouTube channel{channelCount !== 1 ? 's' : ''} by checking:
                      </p>
                      <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                        <li>• OAuth token validity</li>
                        <li>• API access permissions</li>
                        <li>• Credential configuration</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button onClick={handleStart} className="w-full gap-2">
                <ShieldCheck className="h-4 w-4" />
                Start Validation
              </Button>
            </div>
          )}

          {/* Validating state */}
          {isValidating && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-medium">Validating channels...</span>
              </div>
              <Progress value={0} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                This may take a moment...
              </p>
            </div>
          )}

          {/* Error state */}
          {error && !isValidating && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-destructive shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Validation Failed</p>
                    <p className="text-sm text-muted-foreground mt-1">{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results state */}
          {summary && !isValidating && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 pb-3 text-center">
                    <div className="text-2xl font-bold">{summary.total}</div>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </CardContent>
                </Card>
                <Card className="bg-emerald-500/10 border-emerald-500/20">
                  <CardContent className="pt-4 pb-3 text-center">
                    <div className="text-2xl font-bold text-emerald-600">{summary.valid}</div>
                    <p className="text-xs text-emerald-600/80">Valid</p>
                  </CardContent>
                </Card>
                <Card className={cn(
                  summary.issues > 0 
                    ? "bg-red-500/10 border-red-500/20" 
                    : "bg-muted/50"
                )}>
                  <CardContent className="pt-4 pb-3 text-center">
                    <div className={cn(
                      "text-2xl font-bold",
                      summary.issues > 0 ? "text-red-600" : "text-muted-foreground"
                    )}>
                      {summary.issues}
                    </div>
                    <p className={cn(
                      "text-xs",
                      summary.issues > 0 ? "text-red-600/80" : "text-muted-foreground"
                    )}>
                      Issues
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Issues list */}
              {issueResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Channels Needing Attention
                  </h4>
                  <ScrollArea className="h-[200px] rounded-lg border">
                    <div className="p-3 space-y-2">
                      {issueResults.map((result) => {
                        const config = statusConfig[result.status];
                        const StatusIcon = config.icon;
                        
                        return (
                          <div
                            key={result.channelId}
                            className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/50"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", config.bgColor)}>
                                <StatusIcon className={cn("h-4 w-4", config.color)} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {result.channelTitle || 'Unnamed Channel'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {result.message}
                                </p>
                                <Badge 
                                  variant="secondary" 
                                  className={cn("mt-1.5 text-xs", config.color)}
                                >
                                  {config.label}
                                </Badge>
                              </div>
                            </div>
                            
                            {/* Quick actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              {(result.status === 'token_revoked' || result.status === 'no_refresh_token') && onReauthorize && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={() => onReauthorize(result.channelId)}
                                  title="Re-authorize"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {result.status === 'api_not_enabled' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  asChild
                                  title="Open Google Cloud Console"
                                >
                                  <a
                                    href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* All valid message */}
              {summary.issues === 0 && (
                <Card className="bg-emerald-500/10 border-emerald-500/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <div>
                        <p className="text-sm font-medium text-emerald-600">All Channels Valid</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          All {summary.total} channel{summary.total !== 1 ? 's are' : ' is'} properly connected
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Close
                </Button>
                {summary.issues > 0 && (
                  <Button onClick={handleClose} className="flex-1">
                    Go to Channels
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
