import { addDays, setHours, setMinutes } from "date-fns";

import { mockSubjects } from "@/features/subjects/mock-data";

import type { CalendarEvent, EventSource, EventType } from "./types";

/** Deterministic seed so the mock renders the same every session. */
function at(dayOffset: number, hour: number, minute = 0): string {
  const base = setMinutes(setHours(addDays(new Date(), dayOffset), hour), minute);
  return base.toISOString();
}

function pickSubject(i: number) {
  const s = mockSubjects[i % mockSubjects.length];
  if (!s) throw new Error("mock subjects empty");
  return s;
}

const types: EventType[] = ["class", "exam", "deadline", "reminder", "other"];
const sources: EventSource[] = ["manual", "ical", "google", "blackboard"];

export const mockInitialEvents: readonly CalendarEvent[] = Array.from({ length: 14 }).map(
  (_, i) => {
    const subject = pickSubject(i);
    const type = types[i % types.length] ?? "class";
    const source = sources[i % sources.length] ?? "manual";
    const dayOffset = i - 3;
    const hour = 9 + (i % 8);
    return {
      id: `mock-${i}`,
      subjectId: subject.id,
      title: `${subject.shortName} · ${
        type === "class"
          ? "Clase magistral"
          : type === "exam"
            ? "Examen parcial"
            : type === "deadline"
              ? "Entrega"
              : type === "reminder"
                ? "Recordatorio"
                : "Sesión"
      }`,
      startISO: at(dayOffset, hour),
      endISO: at(dayOffset, hour + 1, 30),
      location: type === "exam" ? "Aula B3" : type === "class" ? "Aula A2" : undefined,
      description: undefined,
      source,
      type,
      allDay: false,
    } satisfies CalendarEvent;
  },
);
