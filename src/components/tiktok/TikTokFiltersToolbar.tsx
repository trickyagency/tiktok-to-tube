import { Search, LayoutGrid, List, Filter, ArrowUpDown } from "lucide-react";
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

interface TikTokFiltersToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  viewMode: "cards" | "table";
  onViewModeChange: (mode: "cards" | "table") => void;
  ownerFilter?: string;
  onOwnerFilterChange?: (value: string) => void;
  ownerEmails?: string[];
  isOwner?: boolean;
  totalCount: number;
  filteredCount: number;
}

export const TikTokFiltersToolbar = ({
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
  ownerEmails = [],
  isOwner = false,
  totalCount,
  filteredCount,
}: TikTokFiltersToolbarProps) => {
  const hasActiveFilters = searchQuery || statusFilter !== "all" || ownerFilter;

  const clearFilters = () => {
    onSearchChange("");
    onStatusFilterChange("all");
    if (onOwnerFilterChange) onOwnerFilterChange("");
  };

  return (
    <div className="space-y-3">
      {/* Main toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 p-4 bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by username..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-[140px] bg-background/50 border-border/50">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="scraping">Scraping</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>

          {/* Owner Filter (only for owners) */}
          {isOwner && ownerEmails.length > 0 && onOwnerFilterChange && (
            <Select value={ownerFilter || ""} onValueChange={onOwnerFilterChange}>
              <SelectTrigger className="w-[180px] bg-background/50 border-border/50">
                <SelectValue placeholder="All Owners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Owners</SelectItem>
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
            <SelectTrigger className="w-[160px] bg-background/50 border-border/50">
              <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="username">Username A-Z</SelectItem>
              <SelectItem value="followers">Most Followers</SelectItem>
              <SelectItem value="recent">Recently Added</SelectItem>
              <SelectItem value="lastScraped">Last Scraped</SelectItem>
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="flex items-center rounded-lg border border-border/50 bg-background/50 p-1">
            <Button
              variant={viewMode === "cards" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-3"
              onClick={() => onViewModeChange("cards")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-3"
              onClick={() => onViewModeChange("table")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Results summary & clear filters */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            Showing <span className="font-medium text-foreground">{filteredCount}</span>
            {filteredCount !== totalCount && (
              <> of <span className="font-medium text-foreground">{totalCount}</span></>
            )} accounts
          </span>
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs">
              Filtered
            </Badge>
          )}
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
};
