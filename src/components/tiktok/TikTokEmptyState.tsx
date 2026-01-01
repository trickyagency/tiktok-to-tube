import { Users, Plus, Upload, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface TikTokEmptyStateProps {
  onAddAccount: () => void;
  onBulkImport: () => void;
  hasFilters?: boolean;
  onClearFilters?: () => void;
}

export const TikTokEmptyState = ({
  onAddAccount,
  onBulkImport,
  hasFilters = false,
  onClearFilters,
}: TikTokEmptyStateProps) => {
  if (hasFilters) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted/50 p-4 mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No accounts match your filters</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Try adjusting your search or filter criteria to find the accounts you're looking for.
          </p>
          <Button variant="outline" onClick={onClearFilters}>
            Clear all filters
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed bg-gradient-to-br from-card to-muted/20">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="relative mb-6">
          <div className="rounded-full bg-primary/10 p-6">
            <Users className="h-12 w-12 text-primary" />
          </div>
          <div className="absolute -top-1 -right-1 rounded-full bg-primary p-1.5">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>
        
        <h3 className="text-xl font-semibold mb-2">Get started with TikTok accounts</h3>
        <p className="text-muted-foreground mb-8 max-w-md">
          Add your first TikTok account to start scraping videos and automatically upload them to YouTube.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <Button onClick={onAddAccount} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
          <Button variant="outline" onClick={onBulkImport} className="gap-2">
            <Upload className="h-4 w-4" />
            Bulk Import
          </Button>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 text-left max-w-2xl">
          <div className="p-4 rounded-lg bg-background/50 border border-border/50">
            <div className="rounded-full bg-primary/10 w-8 h-8 flex items-center justify-center mb-3">
              <span className="text-sm font-semibold text-primary">1</span>
            </div>
            <h4 className="font-medium mb-1">Add Account</h4>
            <p className="text-sm text-muted-foreground">
              Enter a TikTok username to start tracking
            </p>
          </div>
          <div className="p-4 rounded-lg bg-background/50 border border-border/50">
            <div className="rounded-full bg-primary/10 w-8 h-8 flex items-center justify-center mb-3">
              <span className="text-sm font-semibold text-primary">2</span>
            </div>
            <h4 className="font-medium mb-1">Scrape Videos</h4>
            <p className="text-sm text-muted-foreground">
              Automatically fetch latest videos from TikTok
            </p>
          </div>
          <div className="p-4 rounded-lg bg-background/50 border border-border/50">
            <div className="rounded-full bg-primary/10 w-8 h-8 flex items-center justify-center mb-3">
              <span className="text-sm font-semibold text-primary">3</span>
            </div>
            <h4 className="font-medium mb-1">Upload to YouTube</h4>
            <p className="text-sm text-muted-foreground">
              Videos are queued for YouTube upload
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
