import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2, Link } from 'lucide-react';
import { useTikTokAccounts } from '@/hooks/useTikTokAccounts';

export function ManualVideoImport() {
  const [open, setOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const queryClient = useQueryClient();
  const { data: accounts } = useTikTokAccounts();

  const importMutation = useMutation({
    mutationFn: async ({ videoUrl, tiktokAccountId }: { videoUrl: string; tiktokAccountId: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('apify-scraper', {
        body: { videoUrl, tiktokAccountId },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to import video');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scraped-videos'] });
      queryClient.invalidateQueries({ queryKey: ['scraped-videos-count'] });
      toast.success(`Imported: ${data.video?.title || 'Video'}`);
      setVideoUrl('');
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!videoUrl.trim()) {
      toast.error('Please enter a TikTok video URL');
      return;
    }

    if (!selectedAccountId) {
      toast.error('Please select a TikTok account');
      return;
    }

    // Validate URL format
    const tiktokUrlPattern = /tiktok\.com\/@[\w.-]+\/video\/\d+/i;
    const shortUrlPattern = /vm\.tiktok\.com\/\w+/i;
    
    if (!tiktokUrlPattern.test(videoUrl) && !shortUrlPattern.test(videoUrl)) {
      toast.error('Please enter a valid TikTok video URL');
      return;
    }

    importMutation.mutate({ videoUrl: videoUrl.trim(), tiktokAccountId: selectedAccountId });
  };

  const hasAccounts = accounts && accounts.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Link className="h-4 w-4" />
          Import Video
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import TikTok Video</DialogTitle>
          <DialogDescription>
            Paste a TikTok video URL to import it manually. This works when automatic scraping fails.
          </DialogDescription>
        </DialogHeader>

        {!hasAccounts ? (
          <div className="text-center py-6 text-muted-foreground">
            <p>Add a TikTok account first before importing videos.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account">TikTok Account</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      @{account.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="videoUrl">Video URL</Label>
              <Input
                id="videoUrl"
                placeholder="https://www.tiktok.com/@username/video/123456789"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                disabled={importMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Paste the full TikTok video URL or short link (vm.tiktok.com/...)
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={importMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={importMutation.isPending}>
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Import
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
