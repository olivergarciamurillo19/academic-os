import "server-only";

import {
  db,
  documents,
  events,
  resources,
  subjects as subjectsTable,
  tasks,
} from "@academic-os/db";
import { and, asc, desc, eq, gte, isNotNull, lte, or, sql } from "drizzle-orm";

import { getSessionUser } from "@/lib/auth";
import { getActiveCohortId } from "@/lib/tenant";

export type NotificationKind =
  | "document_indexed"
  | "event_upcoming"
  | "task_overdue"
  | "cohort_event";

export interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  createdAt: Date;
}

/**
 * Derives notifications from events, tasks, and documents.
 *
 * We don't (yet) have a `notifications` table, so this materialises them
 * on read from the sources that would have inserted rows. Callers treat
 * `createdAt` as "when the underlying fact became true" for sort/unread
 * comparisons against the client's last-seen timestamp.
 */
export async function listNotifications(limit = 10): Promise<Notification[]> {
  const session = await getSessionUser();
  if (!session) return [];
  const cohortId = await getActiveCohortId();

  const now = new Date();
  const past48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const notifications: Notification[] = [];

  // ── Indexed documents (last 48h) ──────────────────────────────────────────
  try {
    const docs = await db
      .select({
        id: documents.id,
        resourceId: documents.resourceId,
        indexedAt: documents.indexedAt,
        title: resources.title,
        subjectId: resources.subjectId,
        subjectName: subjectsTable.name,
      })
      .from(documents)
      .innerJoin(resources, eq(resources.id, documents.resourceId))
      .leftJoin(subjectsTable, eq(subjectsTable.id, resources.subjectId))
      .where(
        and(
          eq(resources.ownerUserId, session.user.id),
          eq(documents.status, "indexed"),
          isNotNull(documents.indexedAt),
          gte(documents.indexedAt, past48h),
        ),
      )
      .orderBy(desc(documents.indexedAt))
      .limit(limit);
    for (const d of docs) {
      if (!d.indexedAt) continue;
      notifications.push({
        id: `doc-${d.id}`,
        kind: "document_indexed",
        title: "Documento listo",
        body: `“${d.title}” está indexado y listo para chat.`,
        href: `/subjects/${d.subjectId}/resources/${d.resourceId}`,
        createdAt: d.indexedAt,
      });
    }
  } catch (err) {
    console.error("[notifications.listNotifications] documents query failed:", err);
  }

  // ── Upcoming events in next 24h ───────────────────────────────────────────
  try {
    const scope = cohortId
      ? or(eq(events.ownerUserId, session.user.id), eq(events.cohortId, cohortId))
      : eq(events.ownerUserId, session.user.id);
    const rows = await db
      .select({
        id: events.id,
        title: events.title,
        startAt: events.startAt,
        location: events.location,
        kind: events.kind,
        isOfficial: events.isOfficial,
        subjectId: events.subjectId,
      })
      .from(events)
      .where(and(scope, gte(events.startAt, now), lte(events.startAt, in24h)))
      .orderBy(asc(events.startAt))
      .limit(limit);
    for (const e of rows) {
      notifications.push({
        id: `evt-${e.id}`,
        kind: e.isOfficial ? "cohort_event" : "event_upcoming",
        title: e.isOfficial ? "Evento oficial" : "Próximo evento",
        body: `${e.title}${e.location ? ` · ${e.location}` : ""}`,
        href: "/calendar",
        createdAt: e.startAt,
      });
    }
  } catch (err) {
    console.error("[notifications.listNotifications] events query failed:", err);
  }

  // ── Overdue tasks ─────────────────────────────────────────────────────────
  try {
    const overdue = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        dueAt: tasks.dueAt,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, session.user.id),
          isNotNull(tasks.dueAt),
          sql`${tasks.dueAt} < NOW()`,
          sql`${tasks.status} != 'done'`,
          sql`${tasks.status} != 'archived'`,
        ),
      )
      .orderBy(desc(tasks.dueAt))
      .limit(limit);
    for (const t of overdue) {
      if (!t.dueAt) continue;
      notifications.push({
        id: `task-${t.id}`,
        kind: "task_overdue",
        title: "Tarea vencida",
        body: t.title,
        href: "/tasks",
        createdAt: t.dueAt,
      });
    }
  } catch (err) {
    console.error("[notifications.listNotifications] tasks query failed:", err);
  }

  notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return notifications.slice(0, limit);
}
