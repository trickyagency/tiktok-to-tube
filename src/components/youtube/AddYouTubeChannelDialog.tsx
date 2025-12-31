import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ExternalLink, AlertTriangle, AlertCircle, Ban, Clock, XCircle } from 'lucide-react';
import { useYouTubeChannels, CreateChannelInput } from '@/hooks/useYouTubeChannels';
import { useTikTokAccounts } from '@/hooks/useTikTokAccounts';
import { useUserAccountLimits } from '@/hooks/useUserAccountLimits';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CopyableUrl } from '@/components/ui/copyable-url';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { OAUTH_REDIRECT_URI, JAVASCRIPT_ORIGIN } from '@/lib/api-config';

interface AddYouTubeChannelDialogProps {
  onSuccess?: () => void;
}

export function AddYouTubeChannelDialog({ onSuccess }: AddYouTubeChannelDialogProps) {
  const [open, setOpen] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState(OAUTH_REDIRECT_URI); // Pre-fill with correct URI
  const [selectedTikTokAccount, setSelectedTikTokAccount] = useState<string>('');

  const { createChannel, isCreating } = useYouTubeChannels();
  const { data: tikTokAccounts = [] } = useTikTokAccounts();
  const { data: limits, isLoading: limitsLoading } = useUserAccountLimits();

  const canAdd = limits?.canAddYouTubeChannel ?? true;
  const remainingSlots = limits?.remainingYouTubeSlots ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!channelName || !clientId || !clientSecret || !canAdd) {
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
    setRedirectUri(OAUTH_REDIRECT_URI); // Reset to default URI
    setSelectedTikTokAccount('');
  };

  const getStatusDisplay = () => {
    const status = limits?.subscriptionStatus;
    switch (status) {
      case 'none':
        return { icon: Ban, message: 'No subscription assigned. Contact administrator.' };
      case 'pending':
        return { icon: Clock, message: 'Subscription pending activation.' };
      case 'expired':
        return { icon: XCircle, message: 'Subscription expired. Contact administrator to renew.' };
      case 'cancelled':
        return { icon: XCircle, message: 'Subscription cancelled. Contact administrator.' };
      default:
        return { icon: AlertCircle, message: `You've reached your YouTube channel limit (${limits?.maxYouTubeChannels})` };
    }
  };

  if (!canAdd && !limitsLoading) {
    const { icon: StatusIcon, message } = getStatusDisplay();
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button disabled className="opacity-60">
            <Plus className="h-4 w-4 mr-2" />
            Add YouTube Channel
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex items-center gap-2">
            <StatusIcon className="h-4 w-4" />
            <p>{message}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add YouTube Channel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add YouTube Channel</DialogTitle>
          <DialogDescription>
            Enter your Google Cloud OAuth credentials for this channel
          </DialogDescription>
        </DialogHeader>

        {remainingSlots <= 2 && remainingSlots > 0 && (
          <Alert className="border-amber-500/30 bg-amber-500/10">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-sm text-amber-600 dark:text-amber-400">
              You have {remainingSlots} YouTube channel slot{remainingSlots !== 1 ? 's' : ''} remaining.
            </AlertDescription>
          </Alert>
        )}

        {/* Required URLs Section */}
        <Alert className="border-amber-500/30 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-sm">
            <strong className="text-amber-600 dark:text-amber-400">Important:</strong> Copy these URLs to your{' '}
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

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
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
            <Label htmlFor="redirect-uri">Redirect URI</Label>
            <Input
              id="redirect-uri"
              placeholder={OAUTH_REDIRECT_URI}
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              <strong>Important:</strong> This must exactly match the Authorized Redirect URI in your Google Cloud Console. 
              Default: <code className="text-xs bg-muted px-1 rounded">{OAUTH_REDIRECT_URI}</code>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tiktok-account">Link TikTok Account (Optional)</Label>
            <Select 
              value={selectedTikTokAccount || "none"} 
              onValueChange={(val) => setSelectedTikTokAccount(val === "none" ? "" : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a TikTok account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
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

          <div className="flex justify-end gap-2 pt-4 border-t">
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
