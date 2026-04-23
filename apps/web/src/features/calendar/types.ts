import type { MockSubject } from "@/features/subjects/mock-data";

export type EventSource = "manual" | "ical" | "google" | "blackboard";
export type EventType = "class" | "exam" | "deadline" | "reminder" | "other";

export interface CalendarEvent {
  id: string;
  subjectId: MockSubject["id"] | null;
  title: string;
  startISO: string;
  endISO: string;
  location?: string;
  description?: string;
  source: EventSource;
  type: EventType;
  /** All-day flag for calendar rendering (collapses time range). */
  allDay?: boolean;
}

export const eventTypeLabels: Record<EventType, string> = {
  class: "Clase",
  exam: "Examen",
  deadline: "Entrega",
  reminder: "Recordatorio",
  other: "Otro",
};

export const eventSourceLabels: Record<EventSource, string> = {
  manual: "Manual",
  ical: "iCal",
  google: "Google",
  blackboard: "Blackboard",
};

/**
 * Accent ring color for the source indicator. Subject color is the
 * primary visual cue; the source is a secondary ring / pip.
 */
export const eventSourceAccent: Record<EventSource, string> = {
  manual: "oklch(0.55 0 0)",
  ical: "oklch(0.62 0.17 252)",
  google: "oklch(0.70 0.17 135)",
  blackboard: "oklch(0.60 0.22 310)",
};
