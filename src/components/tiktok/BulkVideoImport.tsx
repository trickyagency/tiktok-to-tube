import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useTikTokAccounts } from '@/hooks/useTikTokAccounts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface ImportResult {
  url: string;
  status: 'pending' | 'success' | 'error' | 'duplicate';
  message?: string;
}

export function BulkVideoImport() {
  const [open, setOpen] = useState(false);
  const [urls, setUrls] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [progress, setProgress] = useState(0);
  
  const { data: accounts } = useTikTokAccounts();
  const queryClient = useQueryClient();

  const parseUrls = (text: string): string[] => {
    const urlPattern = /https?:\/\/(?:www\.)?(?:tiktok\.com|vm\.tiktok\.com)\/[^\s]+/gi;
    const matches = text.match(urlPattern) || [];
    // Deduplicate
    return [...new Set(matches)];
  };

  const handleImport = async () => {
    if (!selectedAccountId) {
      toast.error('Please select a TikTok account');
      return;
    }

    const parsedUrls = parseUrls(urls);
    
    if (parsedUrls.length === 0) {
      toast.error('No valid TikTok URLs found');
      return;
    }

    if (parsedUrls.length > 100) {
      toast.error('Maximum 100 URLs at a time');
      return;
    }

    setIsImporting(true);
    setProgress(0);
    setResults(parsedUrls.map(url => ({ url, status: 'pending' })));

    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    for (let i = 0; i < parsedUrls.length; i++) {
      const url = parsedUrls[i];
      
      try {
        const { data, error } = await supabase.functions.invoke('tikwm-scraper', {
          body: { videoUrl: url, tiktokAccountId: selectedAccountId },
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data?.error) {
          if (data.error.includes('already been imported')) {
            duplicateCount++;
            setResults(prev => prev.map((r, idx) => 
              idx === i ? { ...r, status: 'duplicate', message: 'Already imported' } : r
            ));
          } else {
            throw new Error(data.error);
          }
        } else {
          successCount++;
          setResults(prev => prev.map((r, idx) => 
            idx === i ? { ...r, status: 'success', message: 'Imported successfully' } : r
          ));
        }
      } catch (error) {
        errorCount++;
        setResults(prev => prev.map((r, idx) => 
          idx === i ? { ...r, status: 'error', message: error instanceof Error ? error.message : 'Import failed' } : r
        ));
      }

      setProgress(((i + 1) / parsedUrls.length) * 100);
      
      // Small delay between requests to avoid rate limiting
      if (i < parsedUrls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setIsImporting(false);
    
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['scraped-videos'] });
    queryClient.invalidateQueries({ queryKey: ['scraped-videos-count'] });
    
    toast.success(
      `Import complete: ${successCount} imported, ${duplicateCount} duplicates, ${errorCount} failed`
    );
  };

  const handleClose = () => {
    if (!isImporting) {
      setOpen(false);
      setUrls('');
      setResults([]);
      setProgress(0);
    }
  };

  const parsedCount = parseUrls(urls).length;
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const duplicateCount = results.filter(r => r.status === 'duplicate').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Video Import</DialogTitle>
          <DialogDescription>
            Paste multiple TikTok video URLs (one per line or space-separated) to import them all at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account">Select TikTok Account</Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an account..." />
              </SelectTrigger>
              <SelectContent>
                {accounts?.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    @{account.username} ({account.display_name || account.username})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="urls">Video URLs</Label>
              {parsedCount > 0 && !isImporting && (
                <Badge variant="secondary">{parsedCount} URLs detected</Badge>
              )}
            </div>
            <Textarea
              id="urls"
              placeholder="Paste TikTok video URLs here...&#10;&#10;Example:&#10;https://www.tiktok.com/@user/video/1234567890&#10;https://www.tiktok.com/@user/video/0987654321&#10;https://vm.tiktok.com/ZM6xxx/"
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              rows={8}
              disabled={isImporting}
              className="font-mono text-sm"
            />
          </div>

          {isImporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importing videos...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm">
                {successCount > 0 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" /> {successCount} imported
                  </span>
                )}
                {duplicateCount > 0 && (
                  <span className="flex items-center gap-1 text-yellow-600">
                    <AlertCircle className="h-4 w-4" /> {duplicateCount} duplicates
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <XCircle className="h-4 w-4" /> {errorCount} failed
                  </span>
                )}
              </div>

              {!isImporting && results.some(r => r.status === 'error') && (
                <div className="max-h-32 overflow-y-auto text-xs space-y-1 p-2 bg-muted rounded">
                  {results
                    .filter(r => r.status === 'error')
                    .map((r, idx) => (
                      <div key={idx} className="text-destructive truncate">
                        {r.url}: {r.message}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>
            {isImporting ? 'Please wait...' : 'Close'}
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={isImporting || parsedCount === 0 || !selectedAccountId}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import {parsedCount} Videos
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
