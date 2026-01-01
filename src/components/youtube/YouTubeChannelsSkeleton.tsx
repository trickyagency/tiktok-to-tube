import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const shimmerClass = "animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]";

export const YouTubeStatsSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-4">
    {[1, 2, 3, 4].map((i) => (
      <Card 
        key={i} 
        className={cn(
          "relative overflow-hidden",
          "bg-card/80 backdrop-blur-xl border-border/50",
          "shadow-lg shadow-black/5"
        )}
        style={{ animationDelay: `${i * 100}ms` }}
      >
        {/* Top gradient strip skeleton */}
        <div className={cn("absolute inset-x-0 top-0 h-1", shimmerClass)} />
        
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className={cn("h-4 w-24", shimmerClass)} />
          <Skeleton className={cn("h-10 w-10 rounded-xl", shimmerClass)} />
        </CardHeader>
        <CardContent>
          <Skeleton className={cn("h-9 w-20 mb-2", shimmerClass)} />
          <Skeleton className={cn("h-3 w-32", shimmerClass)} />
        </CardContent>
      </Card>
    ))}
  </div>
);

export const YouTubeCardsSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <Card 
        key={i} 
        className={cn(
          "relative overflow-hidden",
          "bg-card/80 backdrop-blur-xl border-border/50",
          "shadow-lg shadow-black/5"
        )}
        style={{ animationDelay: `${i * 75}ms` }}
      >
        {/* Top gradient strip skeleton */}
        <div className={cn("absolute inset-x-0 top-0 h-1", shimmerClass)} />
        
        <CardHeader className="pb-3">
          <div className="flex items-start gap-4">
            {/* Avatar skeleton with ring */}
            <div className="relative">
              <Skeleton className={cn("h-16 w-16 rounded-full ring-2 ring-border/30", shimmerClass)} />
              <Skeleton className={cn("absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full border-2 border-card", shimmerClass)} />
            </div>
            
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className={cn("h-5 w-32", shimmerClass)} />
                <Skeleton className={cn("h-8 w-8 rounded-lg opacity-50", shimmerClass)} />
              </div>
              <Skeleton className={cn("h-4 w-28", shimmerClass)} />
              <Skeleton className={cn("h-6 w-24 rounded-full", shimmerClass)} />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Stats grid skeleton */}
          <div className="grid grid-cols-2 gap-3">
            {[1, 2].map((j) => (
              <div 
                key={j} 
                className={cn(
                  "rounded-xl p-3 text-center",
                  "bg-muted/30 border border-border/50"
                )}
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Skeleton className={cn("h-4 w-4 rounded", shimmerClass)} />
                  <Skeleton className={cn("h-5 w-12", shimmerClass)} />
                </div>
                <Skeleton className={cn("h-3 w-16 mx-auto", shimmerClass)} />
              </div>
            ))}
          </div>
          
          {/* Button skeleton */}
          <Skeleton className={cn("h-10 w-full rounded-lg", shimmerClass)} />
          
          {/* Date skeleton */}
          <div className="flex justify-center">
            <Skeleton className={cn("h-3 w-28", shimmerClass)} />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export const YouTubeTableSkeleton = () => (
  <div className={cn(
    "rounded-2xl overflow-hidden",
    "bg-card/80 backdrop-blur-xl border border-border/50",
    "shadow-lg shadow-black/5"
  )}>
    {/* Header */}
    <div className="border-b border-border/50 p-4 bg-muted/30">
      <div className="flex gap-6">
        {[120, 80, 60, 70, 100, 80, 60].map((width, i) => (
          <Skeleton 
            key={i} 
            className={cn("h-4", shimmerClass)} 
            style={{ width: `${width}px`, animationDelay: `${i * 50}ms` }} 
          />
        ))}
      </div>
    </div>
    
    {/* Rows */}
    <div className="divide-y divide-border/30">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div 
          key={i} 
          className={cn(
            "flex items-center gap-4 p-4",
            i % 2 === 0 ? "bg-transparent" : "bg-muted/10"
          )}
          style={{ animationDelay: `${i * 75}ms` }}
        >
          {/* Avatar cell */}
          <div className="flex items-center gap-3 w-[280px]">
            <div className="relative">
              <Skeleton className={cn("h-10 w-10 rounded-full ring-2 ring-border/30", shimmerClass)} />
              <Skeleton className={cn("absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card", shimmerClass)} />
            </div>
            <div className="space-y-1.5">
              <Skeleton className={cn("h-4 w-28", shimmerClass)} />
              <Skeleton className={cn("h-3 w-20", shimmerClass)} />
            </div>
          </div>
          
          {/* Stats */}
          <Skeleton className={cn("h-4 w-16", shimmerClass)} />
          <Skeleton className={cn("h-4 w-12", shimmerClass)} />
          
          {/* Status badge */}
          <Skeleton className={cn("h-6 w-24 rounded-full", shimmerClass)} />
          
          {/* Date */}
          <Skeleton className={cn("h-4 w-20", shimmerClass)} />
          
          {/* Actions */}
          <div className="ml-auto flex gap-2">
            <Skeleton className={cn("h-8 w-8 rounded-lg", shimmerClass)} />
            <Skeleton className={cn("h-8 w-8 rounded-lg", shimmerClass)} />
          </div>
        </div>
      ))}
    </div>
    
    {/* Pagination */}
    <div className="border-t border-border/50 px-4 py-3 bg-muted/20">
      <div className="flex items-center justify-center gap-2">
        <Skeleton className={cn("h-9 w-24 rounded-lg", shimmerClass)} />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className={cn("h-9 w-9 rounded-lg", shimmerClass)} />
        ))}
        <Skeleton className={cn("h-9 w-24 rounded-lg", shimmerClass)} />
      </div>
    </div>
  </div>
);

export const YouTubeFiltersSkeleton = () => (
  <div className={cn(
    "rounded-2xl overflow-hidden p-4",
    "bg-card/80 backdrop-blur-xl border border-border/50",
    "shadow-lg shadow-black/5"
  )}>
    <div className="space-y-4">
      {/* Top row */}
      <div className="flex flex-col lg:flex-row gap-3">
        <Skeleton className={cn("h-11 flex-1 min-w-[200px] rounded-lg", shimmerClass)} />
        <div className="flex gap-1 p-1 rounded-lg bg-muted/30 border border-border/50">
          <Skeleton className={cn("h-9 w-20 rounded-md", shimmerClass)} />
          <Skeleton className={cn("h-9 w-20 rounded-md", shimmerClass)} />
        </div>
      </div>
      
      {/* Bottom row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className={cn("h-9 w-[150px] rounded-lg", shimmerClass)} />
          <Skeleton className={cn("h-9 w-[160px] rounded-lg", shimmerClass)} />
        </div>
        <Skeleton className={cn("h-5 w-24", shimmerClass)} />
      </div>
    </div>
  </div>
);
