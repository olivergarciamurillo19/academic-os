"use client";

import { CalendarDays, List, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useSubjectsForActiveUser } from "@/features/subjects/use-subjects";
import { cn } from "@/lib/utils";

import { AgendaView } from "./agenda-view";
import { EventDialog } from "./event-dialog";
import { useCalendarEvents } from "./event-store";
import { MonthView } from "./month-view";
import { SubjectFilter } from "./subject-filter";
import type { CalendarEvent } from "./types";

type ViewMode = "month" | "agenda";

interface CalendarPageClientProps {
  /** When set, scope everything to this subject and hide the subject filter. */
  subjectId?: string;
}

export function CalendarPageClient({ subjectId }: CalendarPageClientProps) {
  const [view, setView] = useState<ViewMode>("month");
  const [visible, setVisible] = useState<Set<string>>(() => new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [defaultStartISO, setDefaultStartISO] = useState<string | undefined>();

  const events = useCalendarEvents();
  const subjects = useSubjectsForActiveUser();
  useEffect(() => {
    setVisible((prev) => (prev.size === 0 ? new Set(subjects.map((s) => s.id)) : prev));
  }, [subjects]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (subjectId) return e.subjectId === subjectId;
      if (!e.subjectId) return true;
      return visible.has(e.subjectId);
    });
  }, [events, visible, subjectId]);

  function toggle(id: string) {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSelectSlot(iso: string) {
    setEditing(null);
    setDefaultStartISO(iso);
    setDialogOpen(true);
  }

  function handleSelectEvent(event: CalendarEvent) {
    setEditing(event);
    setDefaultStartISO(undefined);
    setDialogOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border bg-background p-0.5">
          <ViewToggle active={view === "month"} onClick={() => setView("month")}>
            <CalendarDays className="mr-1.5 h-4 w-4" />
            Mes
          </ViewToggle>
          <ViewToggle active={view === "agenda"} onClick={() => setView("agenda")}>
            <List className="mr-1.5 h-4 w-4" />
            Agenda
          </ViewToggle>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setDefaultStartISO(new Date().toISOString());
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Nuevo evento
        </Button>
      </div>

      {!subjectId && (
        <SubjectFilter
          visible={visible}
          onToggle={toggle}
          onAll={() => setVisible(new Set(subjects.map((s) => s.id)))}
          onNone={() => setVisible(new Set())}
        />
      )}

      {view === "month" ? (
        <MonthView
          events={filtered}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
        />
      ) : (
        <AgendaView events={filtered} onSelectEvent={handleSelectEvent} />
      )}

      <EventDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        event={editing}
        defaultSubjectId={subjectId}
        defaultStartISO={defaultStartISO}
      />
    </div>
  );
}

function ViewToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 items-center rounded-md px-3 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
