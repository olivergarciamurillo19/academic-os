"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export interface SubjectTab {
  key: string;
  label: string;
  href: Route;
  /** Match this tab when the path equals this href exactly (for the index tab). */
  exact?: boolean;
}

interface SubjectTabsProps {
  tabs: readonly SubjectTab[];
}

export function SubjectTabs({ tabs }: SubjectTabsProps) {
  const pathname = usePathname();

  return (
    <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
      <nav
        aria-label="Secciones de la asignatura"
        className="flex min-w-max items-center gap-1 border-b"
      >
        {tabs.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-10 items-center border-b-2 px-3 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
