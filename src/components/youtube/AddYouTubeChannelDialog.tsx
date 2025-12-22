import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ExternalLink, Info } from 'lucide-react';
import { useYouTubeChannels, CreateChannelInput } from '@/hooks/useYouTubeChannels';
import { useTikTokAccounts } from '@/hooks/useTikTokAccounts';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AddYouTubeChannelDialogProps {
  onSuccess?: () => void;
}

export function AddYouTubeChannelDialog({ onSuccess }: AddYouTubeChannelDialogProps) {
  const [open, setOpen] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState('');
  const [selectedTikTokAccount, setSelectedTikTokAccount] = useState<string>('');

  const { createChannel, isCreating } = useYouTubeChannels();
  const { data: tikTokAccounts = [] } = useTikTokAccounts();

  const defaultRedirectUri = 'https://qpufyeeqosvgipslwday.supabase.co/functions/v1/youtube-oauth?action=callback';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!channelName || !clientId || !clientSecret) {
      return;
    }

    const input: CreateChannelInput = {
      channel_title: channelName,
      google_client_id: clientId.trim(),
      google_client_secret: clientSecret.trim(),
      google_redirect_uri: redirectUri.trim() || undefined,
      tiktok_account_id: selectedTikTokAccount || undefined,
    };

    try {
      await createChannel(input);
      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const resetForm = () => {
    setChannelName('');
    setClientId('');
    setClientSecret('');
    setRedirectUri('');
    setSelectedTikTokAccount('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add YouTube Channel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add YouTube Channel</DialogTitle>
          <DialogDescription>
            Enter your Google Cloud OAuth credentials for this channel
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-primary/20 bg-primary/5">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Important:</strong> Each YouTube channel needs its own Google Cloud project.
            <a 
              href="https://console.cloud.google.com/apis/credentials" 
              target="_blank" 
              rel="noopener noreferrer"
              className="ml-1 text-primary hover:underline inline-flex items-center gap-1"
            >
              Get credentials <ExternalLink className="h-3 w-3" />
            </a>
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="channel-name">Channel Name (Label)</Label>
            <Input
              id="channel-name"
              placeholder="My YouTube Channel"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              A friendly name to identify this channel in the dashboard
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-id">Google Client ID</Label>
            <Input
              id="client-id"
              placeholder="123456789-abc123.apps.googleusercontent.com"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-secret">Google Client Secret</Label>
            <Input
              id="client-secret"
              type="password"
              placeholder="GOCSPX-..."
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="redirect-uri">Redirect URI (Optional)</Label>
            <Input
              id="redirect-uri"
              placeholder={defaultRedirectUri}
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use default. Add this URI to your Google Cloud Console:
            </p>
            <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
              {defaultRedirectUri}
            </code>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tiktok-account">Link TikTok Account (Optional)</Label>
            <Select value={selectedTikTokAccount} onValueChange={setSelectedTikTokAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Select a TikTok account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {tikTokAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    @{account.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Videos from this TikTok account will upload to this YouTube channel
            </p>
          </div>

          <div className="pt-4 border-t space-y-3">
            <h4 className="font-medium text-sm">Setup Instructions:</h4>
            <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Console</a></li>
              <li>Create a new project (or use existing)</li>
              <li>Enable <strong>YouTube Data API v3</strong></li>
              <li>Create OAuth 2.0 credentials (Web application)</li>
              <li>Add the redirect URI shown above to "Authorized redirect URIs"</li>
              <li>Copy Client ID and Client Secret here</li>
            </ol>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || !channelName || !clientId || !clientSecret}>
              {isCreating ? 'Adding...' : 'Add Channel'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
