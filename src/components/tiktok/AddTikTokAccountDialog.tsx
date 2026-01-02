import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, AlertCircle, Ban, Clock, XCircle, CheckCircle2, UserCheck } from 'lucide-react';
import { useAddTikTokAccount, useCheckTikTokUsername } from '@/hooks/useTikTokAccounts';
import { useUserAccountLimits } from '@/hooks/useUserAccountLimits';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AddTikTokAccountDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

export function AddTikTokAccountDialog({ 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange,
  showTrigger = true 
}: AddTikTokAccountDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setInternalOpen;
  const [username, setUsername] = useState('');
  const addAccount = useAddTikTokAccount();
  const { data: limits, isLoading: limitsLoading } = useUserAccountLimits();
  
  // Real-time duplicate check
  const { data: existingAccount, isLoading: isChecking } = useCheckTikTokUsername(username);
  const isDuplicate = !!existingAccount;

  const canAdd = limits?.canAddTikTokAccount ?? false;
  const remainingSlots = limits?.remainingTikTokSlots ?? 0;
  const subscriptionStatus = limits?.subscriptionStatus ?? 'none';
  const subscriptionMessage = limits?.subscriptionMessage ?? '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !canAdd || isDuplicate) return;

    await addAccount.mutateAsync(username.trim());
    setUsername('');
    setOpen(false);
  };

  const formatFollowerCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Get appropriate icon and styling based on subscription status
  const getStatusDisplay = () => {
    switch (subscriptionStatus) {
      case 'none':
        return { icon: Ban, text: 'No subscription', className: 'text-destructive' };
      case 'pending':
        return { icon: Clock, text: 'Subscription pending', className: 'text-amber-500' };
      case 'expired':
        return { icon: XCircle, text: 'Subscription expired', className: 'text-destructive' };
      case 'cancelled':
        return { icon: XCircle, text: 'Subscription cancelled', className: 'text-destructive' };
      default:
        return { icon: AlertCircle, text: `Limit reached (${limits?.maxTikTokAccounts})`, className: 'text-muted-foreground' };
    }
  };

  if (!canAdd && !limitsLoading) {
    const statusDisplay = getStatusDisplay();
    const StatusIcon = statusDisplay.icon;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button disabled className="opacity-60">
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${statusDisplay.className}`} />
            <p>{subscriptionMessage}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add TikTok Account</DialogTitle>
            <DialogDescription>
              Enter a TikTok username to start scraping their videos. The account must be public.
            </DialogDescription>
          </DialogHeader>

          {remainingSlots <= 2 && remainingSlots > 0 && !isDuplicate && (
            <Alert className="my-4 border-amber-500/30 bg-amber-500/10">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-sm text-amber-600 dark:text-amber-400">
                You have {remainingSlots} TikTok account slot{remainingSlots !== 1 ? 's' : ''} remaining.
              </AlertDescription>
            </Alert>
          )}

          <div className="py-4 space-y-3">
            <Label htmlFor="username">TikTok Username</Label>
            <div className="relative">
              <Input
                id="username"
                placeholder="@username or username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`mt-2 pr-10 ${isDuplicate ? 'border-amber-500 focus-visible:ring-amber-500' : ''}`}
                disabled={addAccount.isPending}
              />
              {username.trim().length >= 2 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 mt-1">
                  {isChecking ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : isDuplicate ? (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  )}
                </div>
              )}
            </div>

            {/* Duplicate Account Alert */}
            {isDuplicate && existingAccount && (
              <Alert className="border-amber-500/30 bg-amber-500/10">
                <UserCheck className="h-4 w-4 text-amber-500" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      Account Already Added
                    </p>
                    <div className="flex items-center gap-3 p-2 rounded-md bg-background/50">
                      <Avatar className="h-10 w-10 border">
                        <AvatarImage src={existingAccount.avatar_url || ''} alt={existingAccount.username} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {existingAccount.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">@{existingAccount.username}</p>
                        {existingAccount.follower_count != null && (
                          <p className="text-xs text-muted-foreground">
                            {formatFollowerCount(existingAccount.follower_count)} followers
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This TikTok account is already being tracked on the platform.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={addAccount.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={addAccount.isPending || !username.trim() || isDuplicate || isChecking}
            >
              {addAccount.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scraping...
                </>
              ) : isDuplicate ? (
                'Already Added'
              ) : (
                'Add & Scrape'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
