import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ChevronUp, 
  ChevronDown, 
  MoreHorizontal, 
  RefreshCw, 
  Trash2,
  Youtube,
  CheckCircle,
  AlertCircle,
  Clock,
  RotateCcw
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
import { YouTubeChannelWithOwner } from '@/hooks/useYouTubeChannels';
import { formatDistanceToNow } from 'date-fns';

type SortField = 'channel_title' | 'subscriber_count' | 'created_at';
type SortDirection = 'asc' | 'desc';

interface YouTubeChannelsTableProps {
  channels: YouTubeChannelWithOwner[];
  isOwner: boolean;
  onReauthorize: (channelId: string) => void;
  onRefresh: (channelId: string) => void;
  onDelete: (channelId: string) => void;
  isAuthorizing: string | null;
  isRefreshing: string | null;
  isDeleting: boolean;
}

export function YouTubeChannelsTable({
  channels,
  isOwner,
  onReauthorize,
  onRefresh,
  onDelete,
  isAuthorizing,
  isRefreshing,
  isDeleting,
}: YouTubeChannelsTableProps) {
  const [sortField, setSortField] = useState<SortField>('channel_title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [deleteChannelId, setDeleteChannelId] = useState<string | null>(null);
  const channelToDelete = channels.find(c => c.id === deleteChannelId);

  const sortedChannels = useMemo(() => {
    return [...channels].sort((a, b) => {
      let aVal: string | number | null = a[sortField];
      let bVal: string | number | null = b[sortField];

      // Handle null values
      if (aVal === null) aVal = sortField === 'channel_title' ? '' : 0;
      if (bVal === null) bVal = sortField === 'channel_title' ? '' : 0;

      // For dates, compare timestamps
      if (sortField === 'created_at') {
        aVal = aVal ? new Date(aVal as string).getTime() : 0;
        bVal = bVal ? new Date(bVal as string).getTime() : 0;
      }

      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [channels, sortField, sortDirection]);

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

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'connected':
        return (
          <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        );
      case 'no_channel':
        return (
          <Badge variant="default" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            No Channel
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const needsReconnect = (channel: YouTubeChannelWithOwner) => 
    channel.auth_status === 'failed' || 
    channel.auth_status === 'token_revoked' ||
    (channel.auth_status === 'connected' && !channel.refresh_token);

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('channel_title')}
              >
                <div className="flex items-center">
                  Channel Name
                  <SortIcon field="channel_title" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right"
                onClick={() => handleSort('subscriber_count')}
              >
                <div className="flex items-center justify-end">
                  Subscribers
                  <SortIcon field="subscriber_count" />
                </div>
              </TableHead>
              <TableHead className="text-right">Videos</TableHead>
              <TableHead>Status</TableHead>
              {isOwner && <TableHead>Owner</TableHead>}
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center">
                  Connected At
                  <SortIcon field="created_at" />
                </div>
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedChannels.map((channel) => (
              <TableRow key={channel.id}>
                <TableCell>
                  <Avatar className="h-8 w-8">
                    {channel.channel_thumbnail ? (
                      <AvatarImage src={channel.channel_thumbnail} alt={channel.channel_title || 'Channel'} />
                    ) : (
                      <AvatarFallback className="bg-red-500/10">
                        <Youtube className="h-4 w-4 text-red-500" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">
                  {channel.channel_title || 'Unnamed Channel'}
                </TableCell>
                <TableCell className="text-right">
                  {channel.subscriber_count?.toLocaleString() || 0}
                </TableCell>
                <TableCell className="text-right">
                  {channel.video_count || 0}
                </TableCell>
                <TableCell>{getStatusBadge(channel.auth_status)}</TableCell>
                {isOwner && (
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {channel.owner_email || '-'}
                    </span>
                  </TableCell>
                )}
                <TableCell>
                  {channel.created_at ? (
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(channel.created_at), { addSuffix: true })}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
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
                      {needsReconnect(channel) && (
                        <DropdownMenuItem 
                          onClick={() => onReauthorize(channel.id)}
                          disabled={isAuthorizing === channel.id}
                        >
                          <RotateCcw className={`h-4 w-4 mr-2 ${isAuthorizing === channel.id ? 'animate-spin' : ''}`} />
                          {isAuthorizing === channel.id ? 'Reconnecting...' : 'Reconnect'}
                        </DropdownMenuItem>
                      )}
                      {channel.auth_status === 'connected' && (
                        <DropdownMenuItem 
                          onClick={() => onRefresh(channel.id)}
                          disabled={isRefreshing === channel.id}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing === channel.id ? 'animate-spin' : ''}`} />
                          {isRefreshing === channel.id ? 'Refreshing...' : 'Refresh Token'}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setDeleteChannelId(channel.id)}
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
            {sortedChannels.length === 0 && (
              <TableRow>
                <TableCell colSpan={isOwner ? 8 : 7} className="h-24 text-center text-muted-foreground">
                  No channels found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteChannelId} onOpenChange={() => setDeleteChannelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove YouTube Channel?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{channelToDelete?.channel_title}" from your account. Any scheduled uploads will be cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteChannelId) {
                  onDelete(deleteChannelId);
                  setDeleteChannelId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
