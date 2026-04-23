"use client";

import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useSubjectsForActiveUser } from "@/features/subjects/use-subjects";
import { cn } from "@/lib/utils";

import type { CalendarEvent } from "./types";

interface MonthViewProps {
  events: readonly CalendarEvent[];
  onSelectSlot: (iso: string) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}

export function MonthView({ events, onSelectSlot, onSelectEvent }: MonthViewProps) {
  const [cursor, setCursor] = useState(() => new Date());
  const subjects = useSubjectsForActiveUser();
  const colorById = useMemo(
    () => new Map(subjects.map((s) => [s.id, s.color] as const)),
    [subjects],
  );

  const { days, monthLabel } = useMemo(() => {
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const dayList: Date[] = [];
    let cur = gridStart;
    while (cur <= gridEnd) {
      dayList.push(cur);
      cur = addDays(cur, 1);
    }
    return {
      days: dayList,
      monthLabel: format(cursor, "LLLL yyyy", { locale: es }),
    };
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = format(new Date(event.startISO), "yyyy-MM-dd");
      const existing = map.get(key) ?? [];
      existing.push(event);
      map.set(key, existing);
    }
    return map;
  }, [events]);

  const weekdayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Mes anterior"
            onClick={() => setCursor((d) => addMonths(d, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold capitalize">{monthLabel}</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Mes siguiente"
            onClick={() => setCursor((d) => addMonths(d, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
          Hoy
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="grid grid-cols-7 border-b bg-muted/40 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {weekdayLabels.map((d) => (
            <div key={d} className="p-2 text-center">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const inMonth = isSameMonth(day, cursor);
            const today = isSameDay(day, new Date());
            const key = format(day, "yyyy-MM-dd");
            const dayEvents = eventsByDay.get(key) ?? [];
            return (
              <button
                key={key}
                type="button"
                onClick={() =>
                  onSelectSlot(new Date(new Date(day).setHours(9, 0, 0, 0)).toISOString())
                }
                className={cn(
                  "flex min-h-24 flex-col gap-1 border-b border-r p-1.5 text-left transition-colors hover:bg-accent/40",
                  !inMonth && "bg-muted/30 text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-medium",
                    today && "bg-primary text-primary-foreground",
                  )}
                >
                  {format(day, "d")}
                </span>
                <div className="flex flex-col gap-0.5">
                  {dayEvents.slice(0, 3).map((ev) => {
                    const color =
                      (ev.subjectId ? colorById.get(ev.subjectId) : null) ?? "oklch(0.6 0 0)";
                    return (
                      <span
                        key={ev.id}
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(ev);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelectEvent(ev);
                          }
                        }}
                        className="flex items-center gap-1 rounded-sm px-1 py-0.5 text-[11px] font-medium text-foreground hover:brightness-95"
                        style={{
                          backgroundColor: `color-mix(in oklch, ${color} 30%, transparent)`,
                          borderLeft: `2px solid ${color}`,
                        }}
                      >
                        <span className="truncate">{ev.title}</span>
                      </span>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <span className="text-[11px] text-muted-foreground">
                      +{dayEvents.length - 3} más
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
