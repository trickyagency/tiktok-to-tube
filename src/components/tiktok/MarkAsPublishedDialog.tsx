import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  Loader2,
  SkipForward,
} from 'lucide-react';
import {
  useMarkAsPublished,
  parseVideoUrls,
  isValidTikTokUrl,
  MarkResult,
} from '@/hooks/useMarkAsPublished';
import { TikTokAccountWithOwner } from '@/hooks/useTikTokAccounts';

interface MarkAsPublishedDialogProps {
  account: TikTokAccountWithOwner;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MarkAsPublishedDialog({
  account,
  open,
  onOpenChange,
}: MarkAsPublishedDialogProps) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<MarkResult | null>(null);
  const markAsPublished = useMarkAsPublished();

  const parsedUrls = useMemo(() => parseVideoUrls(input), [input]);
  const validCount = parsedUrls.length;
  const inputLines = input.split('\n').filter((l) => l.trim().length > 0);
  const invalidCount = inputLines.length - validCount;

  const handleSubmit = async () => {
    if (parsedUrls.length === 0) return;

    const result = await markAsPublished.mutateAsync({
      accountId: account.id,
      videoUrls: parsedUrls,
    });

    setResult(result);
  };

  const handleClose = () => {
    setInput('');
    setResult(null);
    onOpenChange(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'marked':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'skipped':
        return <SkipForward className="h-4 w-4 text-amber-500" />;
      case 'invalid':
      case 'wrong_account':
      case 'not_found':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'marked':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            Marked
          </Badge>
        );
      case 'skipped':
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-500/30">
            Skipped
          </Badge>
        );
      case 'invalid':
        return <Badge variant="destructive">Invalid</Badge>;
      case 'wrong_account':
        return <Badge variant="destructive">Wrong Account</Badge>;
      case 'not_found':
        return <Badge variant="destructive">Not Found</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Mark Videos as Published</DialogTitle>
          <DialogDescription>
            Mark TikTok videos that you've already uploaded to YouTube manually.
            These videos will be excluded from future automation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Account indicator */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
            <img
              src={account.avatar_url || undefined}
              alt={account.username}
              className="h-8 w-8 rounded-full"
            />
            <div>
              <p className="font-medium text-sm">@{account.username}</p>
              <p className="text-xs text-muted-foreground">
                Only videos from this account will be processed
              </p>
            </div>
          </div>

          {!result ? (
            <>
              {/* URL input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Paste TikTok video URLs (one per line)
                </label>
                <Textarea
                  placeholder={`https://www.tiktok.com/@${account.username}/video/123456789...
https://www.tiktok.com/@${account.username}/video/987654321...`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={6}
                  className="font-mono text-xs"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {validCount > 0 ? (
                      <span className="text-emerald-600">
                        {validCount} valid URL{validCount !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      'Paste TikTok video URLs above'
                    )}
                    {invalidCount > 0 && (
                      <span className="text-destructive ml-2">
                        • {invalidCount} invalid
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Info alert */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Use full URLs like{' '}
                  <code className="bg-muted px-1 py-0.5 rounded text-[10px]">
                    tiktok.com/@user/video/123...
                  </code>
                  . Short URLs (vm.tiktok.com) are not supported.
                </AlertDescription>
              </Alert>
            </>
          ) : (
            /* Results display */
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-2xl font-bold text-emerald-600">
                    {result.successfullyMarked}
                  </p>
                  <p className="text-xs text-muted-foreground">Marked</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-2xl font-bold text-amber-600">
                    {result.skipped}
                  </p>
                  <p className="text-xs text-muted-foreground">Skipped</p>
                </div>
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-2xl font-bold text-destructive">
                    {result.rejected}
                  </p>
                  <p className="text-xs text-muted-foreground">Rejected</p>
                </div>
              </div>

              {/* Details list */}
              <ScrollArea className="h-48 rounded-lg border">
                <div className="p-2 space-y-2">
                  {result.details.map((detail, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-2 rounded-md bg-muted/30 text-xs"
                    >
                      {getStatusIcon(detail.status)}
                      <div className="flex-1 min-w-0">
                        <p className="font-mono truncate text-[10px] text-muted-foreground">
                          {detail.url}
                        </p>
                        <p className="mt-0.5">{detail.message}</p>
                      </div>
                      {getStatusBadge(detail.status)}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={validCount === 0 || markAsPublished.isPending}
              >
                {markAsPublished.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark {validCount} Video{validCount !== 1 ? 's' : ''} as Published
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
