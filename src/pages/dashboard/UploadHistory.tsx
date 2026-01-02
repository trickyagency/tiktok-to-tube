import { useState, useEffect, useMemo } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { History, Youtube, Upload, Clock, ChevronLeft, ChevronRight, Sparkles, Video, Search, X, CalendarIcon } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useUploadHistory } from '@/hooks/useUploadHistory';
import { useYouTubeChannels } from '@/hooks/useYouTubeChannels';
import UploadHistoryCard from '@/components/history/UploadHistoryCard';
import UploadHistorySkeleton from '@/components/history/UploadHistorySkeleton';
import { cn } from '@/lib/utils';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';

const PAGE_SIZE_OPTIONS = [6, 12, 24, 48];

const UploadHistory = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  
  const { channels, isLoading: channelsLoading } = useYouTubeChannels();
  const { history, channelStats, isLoading: historyLoading, totalCount, totalPages } = useUploadHistory({
    selectedChannelId,
    page,
    pageSize,
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
  });

  const isLoading = channelsLoading || historyLoading;

  useEffect(() => {
    document.title = "Upload History | RepostFlow";
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedChannelId, pageSize, dateRange.from, dateRange.to]);

  // Client-side search filtering
  const filteredHistory = useMemo(() => {
    if (!debouncedSearch.trim()) return history;
    
    const query = debouncedSearch.toLowerCase();
    return history.filter(item => {
      const videoTitle = item.scraped_video?.title?.toLowerCase() || '';
      const channelName = item.youtube_channel?.channel_title?.toLowerCase() || '';
      return videoTitle.includes(query) || channelName.includes(query);
    });
  }, [history, debouncedSearch]);

  const filteredCount = debouncedSearch ? filteredHistory.length : totalCount;
  const hasActiveFilters = dateRange.from || dateRange.to || searchQuery;

  const clearAllFilters = () => {
    setSearchQuery('');
    setDateRange({ from: undefined, to: undefined });
    setSelectedChannelId('all');
  };

  // Get stats for selected channel
  const selectedStats = selectedChannelId !== 'all' && channelStats[selectedChannelId]
    ? channelStats[selectedChannelId]
    : null;

  // Calculate total stats across all channels
  const totalUploads = Object.values(channelStats).reduce((sum, s) => sum + s.totalUploads, 0);

  // Calculate pagination display
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  // Generate page numbers
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('ellipsis');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <DashboardLayout
      title="Upload History"
      description="Track all your video uploads by channel"
    >
      <div className="space-y-6">
        {/* Premium Filters Toolbar */}
        <div className={cn(
          "relative p-4 rounded-2xl",
          "bg-card/80 backdrop-blur-xl",
          "border border-border/50",
          "shadow-lg shadow-black/5"
        )}>
          {/* Top gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          
          <div className="flex flex-col gap-4">
            {/* Row 1: Channel selector & Search */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <Youtube className="h-4 w-4 text-red-500" />
                  </div>
                  <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                    <SelectTrigger className="w-[250px] bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20">
                      <SelectValue placeholder="Select a channel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Channels</SelectItem>
                      {channels.map((channel) => (
                        <SelectItem key={channel.id} value={channel.id}>
                          <div className="flex items-center gap-2">
                            {channel.channel_thumbnail && (
                              <img
                                src={channel.channel_thumbnail}
                                alt=""
                                className="w-5 h-5 rounded-full"
                              />
                            )}
                            {channel.channel_title || 'Untitled Channel'}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Search Input */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by video title or channel..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
                      onClick={() => setSearchQuery('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Date Range & Results */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <DateRangePicker
                  from={dateRange.from}
                  to={dateRange.to}
                  onDateChange={setDateRange}
                  className="w-full sm:w-auto"
                />

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear filters
                  </Button>
                )}

                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium">
                    {filteredCount} result{filteredCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Active Filter Chips */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2">
                {debouncedSearch && (
                  <Badge variant="secondary" className="gap-1.5 bg-primary/10 text-primary border-primary/20">
                    <Search className="h-3 w-3" />
                    "{debouncedSearch}"
                    <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-primary/80">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {dateRange.from && (
                  <Badge variant="secondary" className="gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    <CalendarIcon className="h-3 w-3" />
                    {format(dateRange.from, 'MMM d')} - {dateRange.to ? format(dateRange.to, 'MMM d') : 'Now'}
                    <button onClick={() => setDateRange({ from: undefined, to: undefined })} className="ml-1 hover:text-emerald-500/80">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Channel Stats Card (when specific channel selected) */}
        {selectedStats && selectedChannelId !== 'all' && (
          <Card className={cn(
            "relative overflow-hidden",
            "bg-gradient-to-r from-red-500/10 via-card to-card",
            "border border-red-500/20",
            "backdrop-blur-xl",
            "animate-in fade-in slide-in-from-bottom-2 duration-300"
          )}>
            {/* Decorative gradient */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-500/20 to-transparent rounded-full blur-2xl" />
            
            <CardContent className="p-4 relative">
              <div className="flex items-center gap-4">
                {selectedStats.channelThumbnail ? (
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-pink-500 rounded-full opacity-50 blur-sm" />
                    <img
                      src={selectedStats.channelThumbnail}
                      alt=""
                      className="relative w-14 h-14 rounded-full ring-2 ring-background"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center ring-2 ring-red-500/30">
                    <Youtube className="h-7 w-7 text-red-500" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{selectedStats.channelTitle}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                      <Upload className="h-3 w-3 mr-1.5" />
                      {selectedStats.totalUploads} videos uploaded
                    </Badge>
                    {selectedStats.lastUploadAt && (
                      <Badge variant="secondary" className="bg-muted/50 text-muted-foreground border-border/30">
                        <Clock className="h-3 w-3 mr-1.5" />
                        Last upload {formatDistanceToNow(new Date(selectedStats.lastUploadAt), { addSuffix: true })}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* History List with Premium Container */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl",
          "bg-card/80 backdrop-blur-xl",
          "border border-border/50",
          "shadow-lg shadow-black/5"
        )}>
          {/* Top gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
          
          {/* Header */}
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <History className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-semibold">
                    {selectedChannelId === 'all' ? 'All Uploads' : 'Channel Uploads'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedChannelId === 'all' 
                      ? 'History of all videos published to YouTube'
                      : 'Videos published to this channel'}
                  </p>
                </div>
              </div>
              
              {/* Page size selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Show:</span>
                <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="w-20 h-8 text-xs bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6">
            {isLoading ? (
              <UploadHistorySkeleton count={pageSize} />
            ) : filteredHistory.length === 0 ? (
              <div className="relative text-center py-16">
                {/* Decorative elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-emerald-500/5 to-primary/5 rounded-full blur-3xl" />
                
                <div className="relative">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-primary/20 flex items-center justify-center mb-4">
                    <Video className="h-8 w-8 text-emerald-500" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">
                    {hasActiveFilters ? 'No matching uploads' : 'No uploads yet'}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    {hasActiveFilters
                      ? 'Try adjusting your search or filters to find what you\'re looking for.'
                      : selectedChannelId === 'all'
                        ? 'Your upload history will appear here once you start publishing videos to YouTube'
                        : 'No videos have been uploaded to this channel yet'}
                  </p>
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" className="mt-4" onClick={clearAllFilters}>
                      Clear all filters
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredHistory.map((item, index) => (
                  <UploadHistoryCard key={item.id} item={item} index={index} />
                ))}
              </div>
            )}
          </div>
          
          {/* Premium Pagination */}
          {totalPages > 1 && (
            <div className="p-6 border-t border-border/50 bg-muted/20">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground order-2 sm:order-1">
                  Showing <span className="font-medium text-foreground">{from}-{to}</span> of{' '}
                  <span className="font-medium text-foreground">{totalCount}</span> uploads
                </span>
                
                <Pagination className="order-1 sm:order-2">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className={cn(
                          "cursor-pointer",
                          page === 1 && "pointer-events-none opacity-50"
                        )}
                      />
                    </PaginationItem>
                    
                    {getPageNumbers().map((pageNum, idx) => (
                      <PaginationItem key={idx}>
                        {pageNum === 'ellipsis' ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            onClick={() => setPage(pageNum)}
                            isActive={page === pageNum}
                            className={cn(
                              "cursor-pointer",
                              page === pageNum && "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-emerald-500 hover:from-emerald-600 hover:to-emerald-700"
                            )}
                          >
                            {pageNum}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        className={cn(
                          "cursor-pointer",
                          page === totalPages && "pointer-events-none opacity-50"
                        )}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UploadHistory;
