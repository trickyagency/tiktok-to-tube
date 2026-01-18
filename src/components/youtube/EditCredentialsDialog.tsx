import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExternalLink, AlertTriangle, Save, KeyRound } from 'lucide-react';
import { YouTubeChannelWithOwner, useYouTubeChannels } from '@/hooks/useYouTubeChannels';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CopyableUrl } from '@/components/ui/copyable-url';
import { OAUTH_REDIRECT_URI, JAVASCRIPT_ORIGIN } from '@/lib/api-config';
import { toast } from 'sonner';

interface EditCredentialsDialogProps {
  channel: YouTubeChannelWithOwner;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditCredentialsDialog({ 
  channel,
  open, 
  onOpenChange,
  onSuccess 
}: EditCredentialsDialogProps) {
  const [channelName, setChannelName] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState(OAUTH_REDIRECT_URI);
  const [isSaving, setIsSaving] = useState(false);

  const { updateChannel } = useYouTubeChannels();

  // Pre-fill form when dialog opens
  useEffect(() => {
    if (open && channel) {
      setChannelName(channel.channel_title || '');
      setClientId(channel.google_client_id || '');
      setClientSecret(''); // Don't pre-fill secret for security
      setRedirectUri(channel.google_redirect_uri || OAUTH_REDIRECT_URI);
    }
  }, [open, channel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!channelName || !clientId || !clientSecret) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      await updateChannel({
        id: channel.id,
        channel_title: channelName.trim(),
        google_client_id: clientId.trim(),
        google_client_secret: clientSecret.trim(),
        google_redirect_uri: redirectUri.trim() || OAUTH_REDIRECT_URI,
        // Reset auth status to pending so user can re-authorize
        auth_status: 'pending',
        is_connected: false,
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
      });
      
      toast.success('Credentials updated! Please re-authorize the channel.');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to update credentials:', error);
      toast.error('Failed to update credentials');
    } finally {
      setIsSaving(false);
    }
  };

  // Mask client ID for display
  const maskedClientId = channel.google_client_id 
    ? `${channel.google_client_id.slice(0, 12)}...${channel.google_client_id.slice(-8)}`
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Update OAuth Credentials
          </DialogTitle>
          <DialogDescription>
            Update the Google Cloud OAuth credentials for "{channel.channel_title}"
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-amber-500/30 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-sm">
            <strong className="text-amber-600 dark:text-amber-400">Note:</strong> After updating credentials, 
            you'll need to re-authorize the channel. Make sure these URLs match your{' '}
            <a 
              href="https://console.cloud.google.com/apis/credentials" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Google Cloud Console <ExternalLink className="h-3 w-3" />
            </a>
          </AlertDescription>
        </Alert>

        <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
          <CopyableUrl 
            url={JAVASCRIPT_ORIGIN} 
            label="Authorized JavaScript Origin:"
          />
          <CopyableUrl 
            url={OAUTH_REDIRECT_URI} 
            label="Authorized Redirect URI:"
          />
        </div>

        {maskedClientId && (
          <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded-lg">
            <span className="font-medium">Current Client ID:</span> {maskedClientId}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-channel-name">Channel Name (Label)</Label>
            <Input
              id="edit-channel-name"
              placeholder="My YouTube Channel"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-client-id">Google Client ID *</Label>
            <Input
              id="edit-client-id"
              placeholder="123456789-abc123.apps.googleusercontent.com"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-client-secret">Google Client Secret *</Label>
            <Input
              id="edit-client-secret"
              type="password"
              placeholder="Enter new client secret..."
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              You must re-enter the client secret for security reasons
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-redirect-uri">Redirect URI</Label>
            <Input
              id="edit-redirect-uri"
              placeholder={OAUTH_REDIRECT_URI}
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Must exactly match your Google Cloud Console settings
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !channelName || !clientId || !clientSecret}>
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save & Re-authorize
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
