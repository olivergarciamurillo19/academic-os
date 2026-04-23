import { type ComponentProps } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type LoadingSkeletonProps = ComponentProps<"div"> & {
  variant?: "list" | "card" | "page" | "line";
  lines?: number;
};

export function LoadingSkeleton({
  variant = "list",
  lines = 3,
  className,
  ...props
}: LoadingSkeletonProps) {
  if (variant === "line") {
    return <Skeleton className={cn("h-4 w-full", className)} {...props} />;
  }

  if (variant === "card") {
    return (
      <div className={cn("flex flex-col gap-4 rounded-xl border bg-card p-6", className)} {...props}>
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    );
  }

  if (variant === "page") {
    return (
      <div className={cn("flex flex-col gap-6 p-6", className)} {...props}>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingSkeleton key={i} variant="card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}
