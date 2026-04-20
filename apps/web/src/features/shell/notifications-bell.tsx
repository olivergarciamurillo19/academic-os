"use client";

import { Bell, CalendarClock, CheckCircle, FileText, Flag } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NotificationDto {
  id: string;
  kind: "document_indexed" | "event_upcoming" | "task_overdue" | "cohort_event";
  title: string;
  body: string;
  href: string;
  createdAt: string;
}

const STORAGE_KEY = "aos.notifications.lastSeenISO";

function iconFor(kind: NotificationDto["kind"]) {
  if (kind === "document_indexed") return FileText;
  if (kind === "task_overdue") return Flag;
  if (kind === "cohort_event") return CheckCircle;
  return CalendarClock;
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diffSec = (Date.now() - d.getTime()) / 1000;
  if (diffSec < 60) return "ahora";
  if (diffSec < 3600) return `${String(Math.floor(diffSec / 60))} min`;
  if (diffSec < 86400) return `${String(Math.floor(diffSec / 3600))} h`;
  const days = Math.floor(diffSec / 86400);
  if (days < 0) return `en ${String(-days)} d`;
  return `${String(days)} d`;
}

export function NotificationsBell() {
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  useEffect(() => {
    setLastSeen(localStorage.getItem(STORAGE_KEY));
    void refresh();
    // Refresh every 2 minutes while the tab is visible.
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 120_000);
    return () => clearInterval(id);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { items: NotificationDto[] };
      setItems(json.items);
    } catch {
      // Swallow — bell UI is non-critical.
    }
  }, []);

  const unread = lastSeen
    ? items.filter((i) => i.createdAt > lastSeen).length
    : items.length;

  function markRead() {
    const now = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, now);
    setLastSeen(now);
  }

  return (
    <DropdownMenu onOpenChange={(open) => open && markRead()}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notificaciones" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full px-1 text-[10px]"
            >
              {unread > 99 ? "99+" : unread}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            Sin novedades.
          </p>
        ) : (
          <ul className="max-h-96 overflow-y-auto">
            {items.map((n) => {
              const Icon = iconFor(n.kind);
              const isNew = !lastSeen || n.createdAt > lastSeen;
              return (
                <li key={n.id}>
                  <Link
                    href={{ pathname: n.href }}
                    className="flex items-start gap-2 px-3 py-2 text-sm hover:bg-accent"
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm ${
                        isNew ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-medium">{n.title}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {n.body}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatRelative(n.createdAt)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
