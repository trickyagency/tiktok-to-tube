import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const YouTubeStatsSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-4">
    {[1, 2, 3, 4].map((i) => (
      <Card key={i} className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export const YouTubeCardsSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <Card key={i} className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {[1, 2].map((j) => (
              <div key={j} className="text-center p-2 rounded-lg bg-muted/30">
                <Skeleton className="h-5 w-12 mx-auto mb-1" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-9" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export const YouTubeTableSkeleton = () => (
  <div className="rounded-xl border bg-card">
    <div className="border-b p-4">
      <div className="flex gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>
    </div>
    <div className="divide-y">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const YouTubeFiltersSkeleton = () => (
  <div className="flex flex-col lg:flex-row gap-3 p-4 bg-card/50 rounded-xl border border-border/50">
    <Skeleton className="h-10 flex-1 min-w-[200px]" />
    <div className="flex flex-wrap items-center gap-2">
      <Skeleton className="h-10 w-[140px]" />
      <Skeleton className="h-10 w-[160px]" />
      <Skeleton className="h-10 w-20" />
    </div>
  </div>
);
