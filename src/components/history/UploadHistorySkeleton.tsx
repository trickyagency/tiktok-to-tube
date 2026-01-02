import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface UploadHistorySkeletonProps {
  count?: number;
}

const UploadHistorySkeleton = ({ count = 6 }: UploadHistorySkeletonProps) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "relative overflow-hidden rounded-xl",
            "bg-card/80 backdrop-blur-xl",
            "border border-border/50 border-l-4 border-l-emerald-500/30",
            "p-4"
          )}
          style={{ animationDelay: `${i * 100}ms` }}
        >
          {/* Shimmer overlay */}
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          
          <div className="flex gap-3">
            {/* Thumbnail skeleton */}
            <Skeleton className="w-20 h-14 rounded-lg shrink-0" />
            
            <div className="flex-1 space-y-2 min-w-0">
              {/* Title skeleton */}
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
              
              {/* Channel info skeleton */}
              <div className="flex items-center gap-2 pt-1">
                <Skeleton className="w-4 h-4 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
          
          {/* Bottom actions skeleton */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
            <Skeleton className="h-5 w-24 rounded-full" />
            <div className="flex gap-2">
              <Skeleton className="h-7 w-14 rounded-md" />
              <Skeleton className="h-7 w-24 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UploadHistorySkeleton;
