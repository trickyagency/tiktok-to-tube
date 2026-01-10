import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const StatCardSkeleton = () => (
  <Card className="relative overflow-hidden border-0">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
    </CardContent>
  </Card>
);

export const InsightCardSkeleton = () => (
  <Card className="border-0">
    <CardHeader className="pb-3">
      <Skeleton className="h-4 w-28" />
    </CardHeader>
    <CardContent className="space-y-3">
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-8 rounded-lg" />
        <Skeleton className="h-8 rounded-lg" />
        <Skeleton className="h-8 rounded-lg" />
        <Skeleton className="h-8 rounded-lg" />
      </div>
    </CardContent>
  </Card>
);

export const ProgressRingSkeleton = () => (
  <Card className="border-0">
    <CardHeader className="pb-2">
      <Skeleton className="h-4 w-32" />
    </CardHeader>
    <CardContent>
      <div className="flex items-center gap-4">
        <Skeleton className="w-24 h-24 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export const ActivityItemSkeleton = () => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
    <Skeleton className="w-12 h-8 rounded" />
    <Skeleton className="w-4 h-4 rounded-full" />
    <div className="flex-1 space-y-1.5">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <div className="flex flex-col items-end gap-1">
      <Skeleton className="h-4 w-14 rounded-full" />
      <Skeleton className="h-3 w-12" />
    </div>
  </div>
);

export const QuickActionSkeleton = () => (
  <div className="flex items-center gap-3 p-3 rounded-lg">
    <Skeleton className="h-8 w-8 rounded-lg" />
    <div className="flex-1 space-y-1.5">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-24" />
    </div>
  </div>
);

export const DashboardLoadingState = () => (
  <div className="space-y-6 animate-in fade-in duration-300">
    {/* Welcome Banner Skeleton */}
    <Card className="border-0 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </CardContent>
    </Card>

    {/* Primary Stats Grid Skeleton */}
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>

    {/* Insights Row Skeleton */}
    <div className="grid gap-4 md:grid-cols-3">
      <InsightCardSkeleton />
      <ProgressRingSkeleton />
      <InsightCardSkeleton />
    </div>

    {/* Quick Actions + Activity Skeleton */}
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1 border-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-6 w-20 rounded-md" />
          </div>
          <Skeleton className="h-3 w-40" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <QuickActionSkeleton key={i} />
          ))}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 border-0">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-8 w-16" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <ActivityItemSkeleton key={i} />
          ))}
        </CardContent>
      </Card>
    </div>
  </div>
);
