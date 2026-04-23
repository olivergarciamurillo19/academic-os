"use server";

import { db, events } from "@academic-os/db";
import { and, asc, eq, or } from "drizzle-orm";
import { z } from "zod";

import type {
  CalendarEvent,
  EventSource,
  EventType,
} from "@/features/calendar/types";
import { getSessionUser } from "@/lib/auth";
import { getActiveCohortId } from "@/lib/tenant";


type DbKind = "class" | "exam" | "deadline" | "study_session" | "personal";
type DbSource = "manual" | "ical" | "google_calendar" | "blackboard";

function uiTypeFromDb(kind: DbKind): EventType {
  if (kind === "class") return "class";
  if (kind === "exam") return "exam";
  if (kind === "deadline") return "deadline";
  if (kind === "study_session") return "reminder";
  return "other";
}
function dbKindFromUi(type: EventType): DbKind {
  if (type === "class") return "class";
  if (type === "exam") return "exam";
  if (type === "deadline") return "deadline";
  if (type === "reminder") return "study_session";
  return "personal";
}

function uiSourceFromDb(source: DbSource): EventSource {
  if (source === "google_calendar") return "google";
  if (source === "blackboard") return "blackboard";
  if (source === "ical") return "ical";
  return "manual";
}

interface DbEventRow {
  id: string;
  subjectId: string | null;
  title: string;
  description: string | null;
  startAt: Date;
  endAt: Date | null;
  location: string | null;
  kind: DbKind;
  source: DbSource;
  isAllDay: boolean;
}

function rowToEvent(row: DbEventRow): CalendarEvent {
  return {
    id: row.id,
    subjectId: row.subjectId,
    title: row.title,
    description: row.description ?? undefined,
    startISO: row.startAt.toISOString(),
    endISO: (row.endAt ?? row.startAt).toISOString(),
    location: row.location ?? undefined,
    source: uiSourceFromDb(row.source),
    type: uiTypeFromDb(row.kind),
    allDay: row.isAllDay,
  };
}

export async function listEvents(): Promise<CalendarEvent[]> {
  const session = await getSessionUser();
  if (!session) return [];
  const cohortId = await getActiveCohortId();
  const scope = cohortId
    ? or(eq(events.ownerUserId, session.user.id), eq(events.cohortId, cohortId))
    : eq(events.ownerUserId, session.user.id);
  const rows = await db
    .select({
      id: events.id,
      subjectId: events.subjectId,
      title: events.title,
      description: events.description,
      startAt: events.startAt,
      endAt: events.endAt,
      location: events.location,
      kind: events.kind,
      source: events.source,
      isAllDay: events.isAllDay,
    })
    .from(events)
    .where(scope)
    .orderBy(asc(events.startAt));
  return rows.map(rowToEvent);
}

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  subjectId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(240),
  description: z.string().optional().nullable(),
  startISO: z.string().datetime({ offset: true }),
  endISO: z.string().datetime({ offset: true }),
  location: z.string().optional().nullable(),
  type: z.enum(["class", "exam", "deadline", "reminder", "other"]).default("other"),
  allDay: z.boolean().optional().default(false),
});

export type UpsertEventInput = z.infer<typeof upsertSchema>;

export async function createEvent(input: UpsertEventInput): Promise<CalendarEvent> {
  const session = await getSessionUser();
  if (!session) throw new Error("No autenticado");
  const parsed = upsertSchema.parse(input);
  const [inserted] = await db
    .insert(events)
    .values({
      ownerUserId: session.user.id,
      subjectId: parsed.subjectId ?? null,
      title: parsed.title,
      description: parsed.description ?? null,
      startAt: new Date(parsed.startISO),
      endAt: new Date(parsed.endISO),
      location: parsed.location ?? null,
      kind: dbKindFromUi(parsed.type),
      source: "manual",
      isAllDay: parsed.allDay ?? false,
    })
    .returning({
      id: events.id,
      subjectId: events.subjectId,
      title: events.title,
      description: events.description,
      startAt: events.startAt,
      endAt: events.endAt,
      location: events.location,
      kind: events.kind,
      source: events.source,
      isAllDay: events.isAllDay,
    });
  if (!inserted) throw new Error("Insert falló");
  return rowToEvent(inserted);
}

export async function updateEvent(
  input: UpsertEventInput & { id: string },
): Promise<CalendarEvent> {
  const session = await getSessionUser();
  if (!session) throw new Error("No autenticado");
  const parsed = upsertSchema.extend({ id: z.string().uuid() }).parse(input);
  const [updated] = await db
    .update(events)
    .set({
      subjectId: parsed.subjectId ?? null,
      title: parsed.title,
      description: parsed.description ?? null,
      startAt: new Date(parsed.startISO),
      endAt: new Date(parsed.endISO),
      location: parsed.location ?? null,
      kind: dbKindFromUi(parsed.type),
      isAllDay: parsed.allDay ?? false,
    })
    .where(and(eq(events.id, parsed.id), eq(events.ownerUserId, session.user.id)))
    .returning({
      id: events.id,
      subjectId: events.subjectId,
      title: events.title,
      description: events.description,
      startAt: events.startAt,
      endAt: events.endAt,
      location: events.location,
      kind: events.kind,
      source: events.source,
      isAllDay: events.isAllDay,
    });
  if (!updated) throw new Error("Evento no encontrado");
  return rowToEvent(updated);
}

export async function deleteEvent(id: string): Promise<{ id: string }> {
  const session = await getSessionUser();
  if (!session) throw new Error("No autenticado");
  z.string().uuid().parse(id);
  const rows = await db
    .delete(events)
    .where(and(eq(events.id, id), eq(events.ownerUserId, session.user.id)))
    .returning({ id: events.id });
  if (rows.length === 0) throw new Error("Evento no encontrado");
  return { id };
}
