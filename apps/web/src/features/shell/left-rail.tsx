"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { isNavActive, navItems } from "./nav-items";

export function LeftRail() {
  const pathname = usePathname();
  const primary = navItems.filter((i) => !i.bottom);
  const bottom = navItems.filter((i) => i.bottom);

  return (
    <aside
      aria-label="Navegación principal"
      className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 flex-col border-r bg-background lg:flex"
    >
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {primary.map((item) => (
          <RailLink key={item.key} item={item} active={isNavActive(pathname, item.href)} />
        ))}
      </nav>
      <nav className="flex flex-col gap-1 border-t p-3">
        {bottom.map((item) => (
          <RailLink key={item.key} item={item} active={isNavActive(pathname, item.href)} />
        ))}
      </nav>
    </aside>
  );
}

function RailLink({
  item,
  active,
}: {
  item: (typeof navItems)[number];
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      prefetch
      aria-current={active ? "page" : undefined}
      className={cn(
        "group inline-flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon
        className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")}
        aria-hidden="true"
      />
      <span>{item.label}</span>
    </Link>
  );
}
