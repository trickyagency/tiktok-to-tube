import { Link } from 'react-router-dom';
import { AlertTriangle, PackageOpen, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLowVideoInventory } from '@/hooks/useLowVideoInventory';

export function LowVideoInventoryAlert() {
  const { data: lowInventory = [], isLoading } = useLowVideoInventory();

  if (isLoading || lowInventory.length === 0) return null;

  const emptyCount = lowInventory.filter(a => a.unpublishedCount === 0).length;
  const lowCount = lowInventory.length - emptyCount;

  return (
    <Alert className="mb-6 border-amber-500/50 bg-amber-500/10">
      <PackageOpen className="h-4 w-4 text-amber-500" />
      <AlertTitle className="text-amber-600 dark:text-amber-400 flex items-center gap-2">
        Low Video Inventory
        <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400 text-xs">
          {lowInventory.length} account{lowInventory.length !== 1 ? 's' : ''}
        </Badge>
      </AlertTitle>
      <AlertDescription>
        <p className="text-muted-foreground text-sm mb-3">
          {emptyCount > 0 && `${emptyCount} account${emptyCount !== 1 ? 's have' : ' has'} no videos left. `}
          {lowCount > 0 && `${lowCount} account${lowCount !== 1 ? 's have' : ' has'} fewer than 5 unpublished videos. `}
          Scrape now to avoid schedule interruptions.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {lowInventory.slice(0, 8).map((account) => (
            <div
              key={account.tiktokAccountId}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/60 border border-border text-xs"
            >
              <Avatar className="h-4 w-4">
                <AvatarImage src={account.avatarUrl || undefined} />
                <AvatarFallback className="text-[8px]">
                  {account.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">@{account.username}</span>
              <Badge
                variant="outline"
                className={`text-[10px] px-1 py-0 ${
                  account.unpublishedCount === 0
                    ? 'border-destructive/50 text-destructive'
                    : 'border-amber-500/50 text-amber-600 dark:text-amber-400'
                }`}
              >
                {account.unpublishedCount === 0 ? 'empty' : `${account.unpublishedCount} left`}
              </Badge>
            </div>
          ))}
          {lowInventory.length > 8 && (
            <span className="text-xs text-muted-foreground self-center">
              +{lowInventory.length - 8} more
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" asChild className="shrink-0 border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10">
          <Link to="/dashboard/tiktok">
            Scrape Now <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
