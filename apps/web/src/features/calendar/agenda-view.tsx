"use client";

import { format, isToday, isTomorrow } from "date-fns";
import { es } from "date-fns/locale";
import { MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useSubjectsForActiveUser } from "@/features/subjects/use-subjects";

import {
  eventSourceAccent,
  eventSourceLabels,
  eventTypeLabels,
  type CalendarEvent,
} from "./types";

interface AgendaViewProps {
  events: readonly CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
}

function dayLabel(date: Date): string {
  if (isToday(date)) return "Hoy";
  if (isTomorrow(date)) return "Mañana";
  return format(date, "EEEE, d MMM", { locale: es });
}

export function AgendaView({ events, onSelectEvent }: AgendaViewProps) {
  const subjects = useSubjectsForActiveUser();
  const colorById = new Map(subjects.map((s) => [s.id, s.color] as const));
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No hay eventos con los filtros actuales.
      </div>
    );
  }

  // Group by day.
  const groups = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const key = format(new Date(ev.startISO), "yyyy-MM-dd");
    const bucket = groups.get(key) ?? [];
    bucket.push(ev);
    groups.set(key, bucket);
  }

  return (
    <ol className="flex flex-col gap-5">
      {Array.from(groups.entries()).map(([day, dayEvents]) => {
        const d = new Date(day);
        return (
          <li key={day} className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {dayLabel(d)}
            </h3>
            <ul className="flex flex-col gap-2">
              {dayEvents.map((ev) => {
                const color = (ev.subjectId && colorById.get(ev.subjectId)) || "oklch(0.6 0 0)";
                return (
                  <li key={ev.id}>
                    <button
                      type="button"
                      onClick={() => onSelectEvent(ev)}
                      className="flex w-full items-start gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/50"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-1 h-2 w-2 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-card"
                        style={{
                          backgroundColor: color,
                          // @ts-expect-error CSS var for Tailwind-compatible ring color.
                          "--tw-ring-color": eventSourceAccent[ev.source],
                        }}
                      />
                      <div className="flex flex-1 flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{ev.title}</span>
                          <Badge variant="secondary" className="text-[10px] uppercase">
                            {eventTypeLabels[ev.type]}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <time dateTime={ev.startISO}>
                            {format(new Date(ev.startISO), "HH:mm")} –
                            {" "}
                            {format(new Date(ev.endISO), "HH:mm")}
                          </time>
                          {ev.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {ev.location}
                            </span>
                          )}
                          <span>Origen: {eventSourceLabels[ev.source]}</span>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
