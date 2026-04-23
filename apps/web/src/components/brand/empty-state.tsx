import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  cta?: { label: string; href: Route };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  cta,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card/50 px-6 py-12 text-center",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      </div>
      {cta ? (
        <Button asChild size="sm" className="mt-1">
          <Link href={cta.href}>{cta.label}</Link>
        </Button>
      ) : null}
    </div>
  );
}
