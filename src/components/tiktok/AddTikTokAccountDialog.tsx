import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2 } from 'lucide-react';
import { useAddTikTokAccount } from '@/hooks/useTikTokAccounts';

export function AddTikTokAccountDialog() {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const addAccount = useAddTikTokAccount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    await addAccount.mutateAsync(username.trim());
    setUsername('');
    setOpen(false);
  };

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
