import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Youtube, Save, Loader2, Eye } from 'lucide-react';
import { TikTokAccount } from '@/hooks/useTikTokAccounts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface AccountYouTubeSettingsDialogProps {
  account: TikTokAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountYouTubeSettingsDialog({
  account,
  open,
  onOpenChange,
}: AccountYouTubeSettingsDialogProps) {
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  // Load existing values when dialog opens
  useEffect(() => {
    if (account && open) {
      setDescription(account.youtube_description || '');
      setTags(account.youtube_tags || '');
    }
  }, [account, open]);

  const handleSave = async () => {
    if (!account) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('tiktok_accounts')
        .update({
          youtube_description: description.trim() || null,
          youtube_tags: tags.trim() || null,
        })
        .eq('id', account.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['tiktok-accounts'] });
      toast.success('YouTube settings saved');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Example preview with sample title
  const sampleTitle = 'Amazing Dance Video 🔥';
  const previewDescription = `${sampleTitle}
${sampleTitle}
${sampleTitle}

${description || '(Your description will appear here)'}

${tags || '(Your tags will appear here)'}`.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-500" />
            YouTube Settings for @{account?.username}
          </DialogTitle>
          <DialogDescription>
            Configure the description and tags that will be used for all videos uploaded from this account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Description Input */}
          <div className="space-y-2">
            <Label htmlFor="description">Video Description</Label>
            <p className="text-xs text-muted-foreground">
              This text will appear after the video title (which is repeated 3 times for SEO). 
              Write your channel info, call-to-action, or any text you want on every video.
            </p>
            <Textarea
              id="description"
              placeholder="📺 Subscribe for daily content!&#10;&#10;Follow me on TikTok for more amazing videos.&#10;&#10;Business inquiries: email@example.com"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>

          {/* Tags Input */}
          <div className="space-y-2">
            <Label htmlFor="tags">Hashtags / Tags</Label>
            <p className="text-xs text-muted-foreground">
              These tags will be added at the end of every video description.
            </p>
            <Textarea
              id="tags"
              placeholder="#shorts #viral #trending #fyp #reels"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <Separator />

          {/* Live Preview */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <Label>Preview</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              This is how your video description will look on YouTube:
            </p>
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Video Title: "{sampleTitle}"
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm font-sans text-foreground">
                  {previewDescription}
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
