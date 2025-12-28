import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ImportResult {
  username: string;
  status: 'pending' | 'success' | 'error' | 'duplicate';
  message?: string;
}

export const BulkAccountImport = () => {
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [progress, setProgress] = useState(0);
  const queryClient = useQueryClient();

  const parseUsernames = (text: string): string[] => {
    const tokens = text.split(/[\n,\s]+/).filter(Boolean);
    const cleaned = tokens.map(t => t.replace(/^@/, '').trim().toLowerCase()).filter(Boolean);
    return [...new Set(cleaned)];
  };

  const usernames = parseUsernames(inputText);
  const usernameCount = usernames.length;

  const handleImport = async () => {
    if (usernameCount === 0) return;
    if (usernameCount > 50) {
      toast.error('Maximum 50 accounts at a time');
      return;
    }

    setIsImporting(true);
    setProgress(0);
    setResults(usernames.map(u => ({ username: u, status: 'pending' })));

    let successCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;

    for (let i = 0; i < usernames.length; i++) {
      const username = usernames[i];
      
      try {
        const { data, error } = await supabase.functions.invoke('tikwm-profile', {
          body: { username }
        });

        if (error) throw error;

        if (data?.isNew === false) {
          setResults(prev => prev.map((r, idx) => 
            idx === i ? { ...r, status: 'duplicate', message: 'Account already exists' } : r
          ));
          duplicateCount++;
        } else {
          setResults(prev => prev.map((r, idx) => 
            idx === i ? { ...r, status: 'success' } : r
          ));
          successCount++;
        }
      } catch (error: any) {
        const message = error?.message || 'Failed to add account';
        setResults(prev => prev.map((r, idx) => 
          idx === i ? { ...r, status: 'error', message } : r
        ));
        failedCount++;
      }

      setProgress(((i + 1) / usernames.length) * 100);

      // Small delay between requests to avoid rate limiting
      if (i < usernames.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    await queryClient.invalidateQueries({ queryKey: ['tiktok-accounts'] });

    toast.success(`Import complete: ${successCount} added, ${duplicateCount} duplicates, ${failedCount} failed`);
    setIsImporting(false);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isImporting) {
      setOpen(isOpen);
      if (!isOpen) {
        setInputText('');
        setResults([]);
        setProgress(0);
      }
    }
  };

  const successResults = results.filter(r => r.status === 'success');
  const duplicateResults = results.filter(r => r.status === 'duplicate');
  const failedResults = results.filter(r => r.status === 'error');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="h-4 w-4 mr-2" />
          Bulk Add
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Add TikTok Accounts</DialogTitle>
          <DialogDescription>
            Add multiple TikTok accounts at once. Enter usernames separated by commas, spaces, or new lines.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="@username1&#10;username2&#10;@username3"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={6}
              disabled={isImporting}
              className="font-mono text-sm"
            />
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>One username per line, or comma/space separated</span>
              {usernameCount > 0 && (
                <Badge variant={usernameCount > 50 ? 'destructive' : 'secondary'}>
                  {usernameCount} username{usernameCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>

          {usernameCount > 50 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Maximum 50 accounts at a time. Please reduce the list.
              </AlertDescription>
            </Alert>
          )}

          {isImporting && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Processing {Math.round(progress)}%
              </p>
            </div>
          )}

          {results.length > 0 && !isImporting && (
            <div className="space-y-3">
              <div className="flex gap-3 text-sm">
                {successResults.length > 0 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    {successResults.length} added
                  </span>
                )}
                {duplicateResults.length > 0 && (
                  <span className="flex items-center gap-1 text-yellow-600">
                    <AlertTriangle className="h-4 w-4" />
                    {duplicateResults.length} duplicates
                  </span>
                )}
                {failedResults.length > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <XCircle className="h-4 w-4" />
                    {failedResults.length} failed
                  </span>
                )}
              </div>

              {failedResults.length > 0 && (
                <div className="text-xs space-y-1 max-h-24 overflow-y-auto">
                  <p className="font-medium text-destructive">Failed:</p>
                  {failedResults.map((r, i) => (
                    <p key={i} className="text-muted-foreground">
                      @{r.username}: {r.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleClose(false)} disabled={isImporting}>
              {results.length > 0 && !isImporting ? 'Close' : 'Cancel'}
            </Button>
            {(!results.length || isImporting) && (
              <Button 
                onClick={handleImport} 
                disabled={usernameCount === 0 || usernameCount > 50 || isImporting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>Add {usernameCount} Account{usernameCount !== 1 ? 's' : ''}</>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
