import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ChevronUp, 
  ChevronDown, 
  MoreHorizontal, 
  Video, 
  RefreshCw, 
  Trash2, 
  Eye,
  User
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TikTokAccountWithOwner } from '@/hooks/useTikTokAccounts';
import { formatDistanceToNow } from 'date-fns';

type SortField = 'username' | 'follower_count' | 'video_count' | 'last_scraped_at';
type SortDirection = 'asc' | 'desc';

interface TikTokAccountsTableProps {
  accounts: TikTokAccountWithOwner[];
  isOwner: boolean;
  onViewVideos: (account: TikTokAccountWithOwner) => void;
  onScrape: (accountId: string) => void;
  onSyncProfile: (accountId: string) => void;
  onDelete: (accountId: string) => void;
  isScraping: string | null;
  isSyncing: string | null;
}

export function TikTokAccountsTable({
  accounts,
  isOwner,
  onViewVideos,
  onScrape,
  onSyncProfile,
  onDelete,
  isScraping,
  isSyncing,
}: TikTokAccountsTableProps) {
  const [sortField, setSortField] = useState<SortField>('username');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);
  const accountToDelete = accounts.find(a => a.id === deleteAccountId);

  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => {
      let aVal: string | number | null = a[sortField];
      let bVal: string | number | null = b[sortField];

      // Handle null values
      if (aVal === null) aVal = sortField === 'username' ? '' : 0;
      if (bVal === null) bVal = sortField === 'username' ? '' : 0;

      // For dates, compare timestamps
      if (sortField === 'last_scraped_at') {
        aVal = aVal ? new Date(aVal as string).getTime() : 0;
        bVal = bVal ? new Date(bVal as string).getTime() : 0;
      }

      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [accounts, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-4 w-4 ml-1" /> 
      : <ChevronDown className="h-4 w-4 ml-1" />;
  };

  const getStatusBadge = (scrapeStatus: string | null) => {
    switch (scrapeStatus) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">Completed</Badge>;
      case 'scraping':
        return <Badge variant="secondary">Scraping...</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">Idle</Badge>;
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('username')}
              >
                <div className="flex items-center">
                  Username
                  <SortIcon field="username" />
                </div>
              </TableHead>
              <TableHead>Display Name</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right"
                onClick={() => handleSort('follower_count')}
              >
                <div className="flex items-center justify-end">
                  Followers
                  <SortIcon field="follower_count" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right"
                onClick={() => handleSort('video_count')}
              >
                <div className="flex items-center justify-end">
                  Videos
                  <SortIcon field="video_count" />
                </div>
              </TableHead>
              <TableHead>Status</TableHead>
              {isOwner && <TableHead>Owner</TableHead>}
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('last_scraped_at')}
              >
                <div className="flex items-center">
                  Last Scraped
                  <SortIcon field="last_scraped_at" />
                </div>
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAccounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell>
                  <Avatar className="h-8 w-8">
                    {account.avatar_url ? (
                      <AvatarImage src={account.avatar_url} alt={account.username} />
                    ) : (
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">@{account.username}</TableCell>
                <TableCell className="text-muted-foreground">
                  {account.display_name || '-'}
                </TableCell>
                <TableCell className="text-right">
                  {account.follower_count?.toLocaleString() || 0}
                </TableCell>
                <TableCell className="text-right">
                  {account.video_count || 0}
                </TableCell>
                <TableCell>{getStatusBadge(account.scrape_status)}</TableCell>
                {isOwner && (
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {account.owner_email || '-'}
                    </span>
                  </TableCell>
                )}
                <TableCell>
                  {account.last_scraped_at ? (
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(account.last_scraped_at), { addSuffix: true })}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Never</span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewVideos(account)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Videos
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onScrape(account.id)}
                        disabled={isScraping === account.id}
                      >
                        <Video className="h-4 w-4 mr-2" />
                        {isScraping === account.id ? 'Scraping...' : 'Scrape Now'}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onSyncProfile(account.id)}
                        disabled={isSyncing === account.id}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing === account.id ? 'animate-spin' : ''}`} />
                        {isSyncing === account.id ? 'Syncing...' : 'Sync Profile'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setDeleteAccountId(account.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {sortedAccounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={isOwner ? 9 : 8} className="h-24 text-center text-muted-foreground">
                  No accounts found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteAccountId} onOpenChange={() => setDeleteAccountId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete TikTok Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete @{accountToDelete?.username} and all scraped videos. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteAccountId) {
                  onDelete(deleteAccountId);
                  setDeleteAccountId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
