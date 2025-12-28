import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, AlertCircle } from 'lucide-react';
import { useAddTikTokAccount } from '@/hooks/useTikTokAccounts';
import { useUserAccountLimits } from '@/hooks/useUserAccountLimits';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function AddTikTokAccountDialog() {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const addAccount = useAddTikTokAccount();
  const { data: limits, isLoading: limitsLoading } = useUserAccountLimits();

  const canAdd = limits?.canAddTikTokAccount ?? true;
  const remainingSlots = limits?.remainingTikTokSlots ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !canAdd) return;

    await addAccount.mutateAsync(username.trim());
    setUsername('');
    setOpen(false);
  };

  if (!canAdd && !limitsLoading) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button disabled className="opacity-60">
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>You've reached your TikTok account limit ({limits?.maxTikTokAccounts})</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add TikTok Account</DialogTitle>
            <DialogDescription>
              Enter a TikTok username to start scraping their videos. The account must be public.
            </DialogDescription>
          </DialogHeader>

          {remainingSlots <= 2 && remainingSlots > 0 && (
            <Alert className="my-4 border-amber-500/30 bg-amber-500/10">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-sm text-amber-600 dark:text-amber-400">
                You have {remainingSlots} TikTok account slot{remainingSlots !== 1 ? 's' : ''} remaining.
              </AlertDescription>
            </Alert>
          )}

          <div className="py-4">
            <Label htmlFor="username">TikTok Username</Label>
            <Input
              id="username"
              placeholder="@username or username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-2"
              disabled={addAccount.isPending}
            />
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
            <Button type="submit" disabled={addAccount.isPending || !username.trim()}>
              {addAccount.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scraping...
                </>
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
