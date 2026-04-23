"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { isNavActive, navItems } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();
  const items = navItems.filter((i) => i.mobile);

  return (
    <nav
      aria-label="Navegación"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 lg:hidden"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-4">
        {items.map((item) => {
          const active = isNavActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.key} className="contents">
              <Link
                href={item.href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
