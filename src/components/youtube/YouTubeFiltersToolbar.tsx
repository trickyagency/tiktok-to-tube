import { Search, X, LayoutGrid, List, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface YouTubeFiltersToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  viewMode: 'cards' | 'table';
  onViewModeChange: (mode: 'cards' | 'table') => void;
  ownerFilter: string;
  onOwnerFilterChange: (value: string) => void;
  ownerEmails: string[];
  isOwner: boolean;
  totalCount: number;
  filteredCount: number;
}

export const YouTubeFiltersToolbar = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  viewMode,
  onViewModeChange,
  ownerFilter,
  onOwnerFilterChange,
  ownerEmails,
  isOwner,
  totalCount,
  filteredCount,
}: YouTubeFiltersToolbarProps) => {
  const hasActiveFilters = searchQuery || statusFilter !== 'all' || ownerFilter !== 'all';

  const clearFilters = () => {
    onSearchChange('');
    onStatusFilterChange('all');
    onOwnerFilterChange('all');
  };

  return (
    <div className="space-y-4">
      {/* Main Toolbar */}
      <div className="relative p-4 bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 shadow-lg shadow-black/5">
        {/* Top gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={cn(
                "pl-10 h-11 bg-background/60 border-border/50 rounded-xl",
                "transition-all duration-300",
                "focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
                "focus:bg-background focus:shadow-lg focus:shadow-primary/5"
              )}
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className="w-[150px] h-11 bg-background/60 border-border/50 rounded-xl hover:bg-background hover:shadow-md transition-all duration-200">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/50 bg-card/95 backdrop-blur-xl">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="connected">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Connected
                  </span>
                </SelectItem>
                <SelectItem value="pending">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Pending
                  </span>
                </SelectItem>
                <SelectItem value="no_channel">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    No Channel
                  </span>
                </SelectItem>
                <SelectItem value="failed">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    Failed
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Owner Filter (only for owners) */}
            {isOwner && ownerEmails.length > 0 && (
              <Select value={ownerFilter} onValueChange={onOwnerFilterChange}>
                <SelectTrigger className="w-[180px] h-11 bg-background/60 border-border/50 rounded-xl hover:bg-background hover:shadow-md transition-all duration-200">
                  <SelectValue placeholder="Owner" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/50 bg-card/95 backdrop-blur-xl">
                  <SelectItem value="all">All Owners</SelectItem>
                  {ownerEmails.map((email) => (
                    <SelectItem key={email} value={email}>
                      {email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Sort */}
            <Select value={sortBy} onValueChange={onSortByChange}>
              <SelectTrigger className="w-[160px] h-11 bg-background/60 border-border/50 rounded-xl hover:bg-background hover:shadow-md transition-all duration-200">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/50 bg-card/95 backdrop-blur-xl">
                <SelectItem value="recent">Recently Added</SelectItem>
                <SelectItem value="name">Channel Name</SelectItem>
                <SelectItem value="subscribers">Subscribers</SelectItem>
                <SelectItem value="updated">Last Updated</SelectItem>
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div className="flex items-center p-1 rounded-xl bg-muted/50 border border-border/30">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewModeChange('cards')}
                className={cn(
                  "h-9 px-3 rounded-lg transition-all duration-200",
                  viewMode === 'cards' 
                    ? "bg-background shadow-md text-foreground" 
                    : "hover:bg-background/50 text-muted-foreground"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewModeChange('table')}
                className={cn(
                  "h-9 px-3 rounded-lg transition-all duration-200",
                  viewMode === 'table' 
                    ? "bg-background shadow-md text-foreground" 
                    : "hover:bg-background/50 text-muted-foreground"
                )}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Results summary & Active Filter Chips */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary/60" />
            <span>
              Showing <span className="font-semibold text-foreground">{filteredCount}</span> of{' '}
              <span className="font-semibold text-foreground">{totalCount}</span> channels
            </span>
          </div>
          
          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
              {statusFilter !== 'all' && (
                <Badge 
                  variant="secondary" 
                  className="pl-2 pr-1 py-1 gap-1.5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
                >
                  Status: {statusFilter}
                  <button 
                    onClick={() => onStatusFilterChange('all')}
                    className="p-0.5 rounded-full hover:bg-primary/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {ownerFilter !== 'all' && (
                <Badge 
                  variant="secondary" 
                  className="pl-2 pr-1 py-1 gap-1.5 bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                >
                  Owner: {ownerFilter.split('@')[0]}
                  <button 
                    onClick={() => onOwnerFilterChange('all')}
                    className="p-0.5 rounded-full hover:bg-blue-500/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {searchQuery && (
                <Badge 
                  variant="secondary" 
                  className="pl-2 pr-1 py-1 gap-1.5 bg-muted border-border/50 hover:bg-muted/80 transition-colors"
                >
                  Search: "{searchQuery.slice(0, 15)}{searchQuery.length > 15 ? '...' : ''}"
                  <button 
                    onClick={() => onSearchChange('')}
                    className="p-0.5 rounded-full hover:bg-accent"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground gap-1.5 hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <X className="h-4 w-4" />
            Clear all
          </Button>
        )}
      </div>
    </div>
  );
};
