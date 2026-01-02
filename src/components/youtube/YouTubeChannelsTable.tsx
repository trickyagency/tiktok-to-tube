import { useState, useMemo, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
  RotateCcw,
  ArrowUpDown
} from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const channelToDelete = channels.find(c => c.id === deleteChannelId);

  useEffect(() => {
    setCurrentPage(1);
  }, [channels.length]);

  const sortedChannels = useMemo(() => {
    return [...channels].sort((a, b) => {
      let aVal: string | number | null = a[sortField];
      let bVal: string | number | null = b[sortField];

      if (aVal === null) aVal = sortField === 'channel_title' ? '' : 0;
      if (bVal === null) bVal = sortField === 'channel_title' ? '' : 0;

      if (sortField === 'created_at') {
        aVal = aVal ? new Date(aVal as string).getTime() : 0;
        bVal = bVal ? new Date(bVal as string).getTime() : 0;
      }

      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [channels, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedChannels.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedChannels = sortedChannels.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, 'ellipsis', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages);
      }
    }
    return pages;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 ml-1.5 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-4 w-4 ml-1 text-primary" /> 
      : <ChevronDown className="h-4 w-4 ml-1 text-primary" />;
  };

  const getStatusBadge = (status: string | null) => {
    const baseClass = "gap-1.5 font-medium";
    switch (status) {
      case 'connected':
        return (
          <Badge className={cn(baseClass, "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30")}>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Connected
          </Badge>
        );
      case 'no_channel':
        return (
          <Badge className={cn(baseClass, "bg-amber-500/10 text-amber-600 border border-amber-500/30")}>
            <AlertCircle className="h-3 w-3" />
            No Channel
          </Badge>
        );
      case 'failed':
        return (
          <Badge className={cn(baseClass, "bg-red-500/10 text-red-600 border border-red-500/30")}>
            <AlertCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className={cn(baseClass)}>
            <Clock className="h-3 w-3" />
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
      {/* Premium table container */}
      <div className="relative rounded-2xl border border-border/50 overflow-hidden bg-card/80 backdrop-blur-xl shadow-lg shadow-black/5">
        {/* Top gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border/50 bg-muted/30">
              <TableHead className="w-[50px]"></TableHead>
              <TableHead 
                className="cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('channel_title')}
              >
                <div className="flex items-center font-semibold">
                  Channel Name
                  <SortIcon field="channel_title" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:text-foreground transition-colors text-right"
                onClick={() => handleSort('subscriber_count')}
              >
                <div className="flex items-center justify-end font-semibold">
                  Subscribers
                  <SortIcon field="subscriber_count" />
                </div>
              </TableHead>
              <TableHead className="text-right font-semibold">Videos</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              {isOwner && <TableHead className="font-semibold">Owner</TableHead>}
              <TableHead 
                className="cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center font-semibold">
                  Connected At
                  <SortIcon field="created_at" />
                </div>
              </TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedChannels.map((channel, index) => (
              <TableRow 
                key={channel.id}
                className={cn(
                  "group transition-all duration-200",
                  "border-l-2 border-l-transparent",
                  "hover:bg-muted/50 hover:border-l-primary",
                  index % 2 === 0 ? "bg-transparent" : "bg-muted/10"
                )}
              >
                <TableCell className="py-3">
                  <Avatar className="h-9 w-9 rounded-lg transition-transform group-hover:scale-105">
                    {channel.channel_thumbnail ? (
                      <AvatarImage src={channel.channel_thumbnail} alt={channel.channel_title || 'Channel'} className="object-cover" />
                    ) : (
                      <AvatarFallback className="rounded-lg bg-red-500/10">
                        <Youtube className="h-4 w-4 text-red-500" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium py-3">
                  <span className="group-hover:text-primary transition-colors">
                    {channel.channel_title || 'Unnamed Channel'}
                  </span>
                </TableCell>
                <TableCell className="text-right py-3 tabular-nums">
                  {channel.subscriber_count?.toLocaleString() || 0}
                </TableCell>
                <TableCell className="text-right py-3 tabular-nums">
                  {channel.video_count || 0}
                </TableCell>
                <TableCell className="py-3">{getStatusBadge(channel.auth_status)}</TableCell>
                {isOwner && (
                  <TableCell className="py-3">
                    <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                      {channel.owner_email || '-'}
                    </span>
                  </TableCell>
                )}
                <TableCell className="py-3">
                  {channel.created_at ? (
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(channel.created_at), { addSuffix: true })}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-muted">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        {needsReconnect(channel) && (
                          <DropdownMenuItem 
                            onClick={() => onReauthorize(channel.id)}
                            disabled={isAuthorizing === channel.id}
                          >
                            <RotateCcw className={cn("h-4 w-4 mr-2", isAuthorizing === channel.id && 'animate-spin')} />
                            {isAuthorizing === channel.id ? 'Reconnecting...' : 'Reconnect'}
                          </DropdownMenuItem>
                        )}
                        {channel.auth_status === 'connected' && (
                          <DropdownMenuItem 
                            onClick={() => onRefresh(channel.id)}
                            disabled={isRefreshing === channel.id}
                          >
                            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing === channel.id && 'animate-spin')} />
                            {isRefreshing === channel.id ? 'Refreshing...' : 'Refresh Token'}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setDeleteChannelId(channel.id)}
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {sortedChannels.length === 0 && (
              <TableRow>
                <TableCell colSpan={isOwner ? 8 : 7} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Youtube className="h-8 w-8 text-muted-foreground/50" />
                    <span>No channels found</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Premium Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/30">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              Showing <span className="font-semibold text-foreground">{startIndex + 1}-{Math.min(endIndex, sortedChannels.length)}</span> of{' '}
              <span className="font-semibold text-foreground">{sortedChannels.length}</span> channels
            </span>
            <Select
              value={String(itemsPerPage)}
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[70px] h-8 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span>per page</span>
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={cn(
                    "rounded-lg transition-all",
                    currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-muted'
                  )}
                />
              </PaginationItem>
              
              {getPageNumbers().map((page, i) => (
                <PaginationItem key={i}>
                  {page === 'ellipsis' ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                      className={cn(
                        "cursor-pointer rounded-lg transition-all",
                        currentPage === page && "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      )}
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={cn(
                    "rounded-lg transition-all",
                    currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-muted'
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <AlertDialog open={!!deleteChannelId} onOpenChange={() => setDeleteChannelId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove YouTube Channel?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{channelToDelete?.channel_title}" from your account. Any scheduled uploads will be cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteChannelId) {
                  onDelete(deleteChannelId);
                  setDeleteChannelId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
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
