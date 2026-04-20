import "server-only";

import {
  conversations,
  db,
  documents,
  events,
  resources,
  subjects as subjectsTable,
  tasks,
} from "@academic-os/db";
import { and, asc, desc, eq, gte, lte, or } from "drizzle-orm";

import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getActiveCohortId } from "@/lib/tenant";

export interface UpcomingEvent {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date | null;
  subjectId: string | null;
  subjectName: string | null;
  location: string | null;
  kind: "class" | "exam" | "deadline" | "study_session" | "personal";
}

export interface PendingTask {
  id: string;
  title: string;
  dueAt: Date | null;
  subjectId: string | null;
  subjectName: string | null;
  priority: number;
  status: "todo" | "doing";
}

export interface RecentConversation {
  id: string;
  title: string;
  updatedAt: Date;
  subjectId: string;
  subjectName: string | null;
}

export interface IndexedDocument {
  resourceId: string;
  title: string;
  subjectId: string;
  subjectName: string | null;
  indexedAt: Date;
}

export interface ContinueStudying {
  subjectId: string;
  subjectName: string;
  lastConversationId: string | null;
  lastResourceId: string | null;
}

export interface CohortNotice {
  id: string;
  title: string;
  startAt: Date;
  kind: "class" | "exam" | "deadline" | "study_session" | "personal";
  location: string | null;
}

export interface DashboardData {
  upcomingEvents: readonly UpcomingEvent[];
  pendingTasks: readonly PendingTask[];
  recentConversation: RecentConversation | null;
  indexedDocuments: readonly IndexedDocument[];
  continueStudying: ContinueStudying | null;
  cohortNotices: readonly CohortNotice[];
  ready: boolean;
}

const EMPTY: DashboardData = {
  upcomingEvents: [],
  pendingTasks: [],
  recentConversation: null,
  indexedDocuments: [],
  continueStudying: null,
  cohortNotices: [],
  ready: false,
};

export async function loadDashboardData(): Promise<DashboardData> {
  if (!isSupabaseConfigured()) return EMPTY;
  const session = await getSessionUser();
  if (!session) return EMPTY;
  const cohortId = await getActiveCohortId();

  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // ── Upcoming events (owner or cohort scope) ───────────────────────────────
  let upcomingRows: {
    id: string;
    title: string;
    startAt: Date;
    endAt: Date | null;
    subjectId: string | null;
    subjectName: string | null;
    location: string | null;
    kind: UpcomingEvent["kind"];
  }[] = [];
  try {
    const scope = cohortId
      ? or(eq(events.ownerUserId, session.user.id), eq(events.cohortId, cohortId))
      : eq(events.ownerUserId, session.user.id);
    upcomingRows = await db
      .select({
        id: events.id,
        title: events.title,
        startAt: events.startAt,
        endAt: events.endAt,
        subjectId: events.subjectId,
        subjectName: subjectsTable.name,
        location: events.location,
        kind: events.kind,
      })
      .from(events)
      .leftJoin(subjectsTable, eq(subjectsTable.id, events.subjectId))
      .where(and(scope, gte(events.startAt, now), lte(events.startAt, in48h)))
      .orderBy(asc(events.startAt))
      .limit(5);
  } catch (err) {
    console.error("[dashboard] upcoming events query failed:", err);
  }

  // ── Pending tasks for this user ───────────────────────────────────────────
  let taskRows: {
    id: string;
    title: string;
    dueAt: Date | null;
    subjectId: string | null;
    subjectName: string | null;
    priority: number;
    status: "todo" | "doing" | "done" | "archived";
  }[] = [];
  try {
    taskRows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        dueAt: tasks.dueAt,
        subjectId: tasks.subjectId,
        subjectName: subjectsTable.name,
        priority: tasks.priority,
        status: tasks.status,
      })
      .from(tasks)
      .leftJoin(subjectsTable, eq(subjectsTable.id, tasks.subjectId))
      .where(and(eq(tasks.userId, session.user.id), or(eq(tasks.status, "todo"), eq(tasks.status, "doing"))))
      .orderBy(asc(tasks.dueAt))
      .limit(6);
  } catch (err) {
    console.error("[dashboard] pending tasks query failed:", err);
  }

  // ── Most recent conversation ──────────────────────────────────────────────
  let recentConversation: RecentConversation | null = null;
  try {
    const rows = await db
      .select({
        id: conversations.id,
        title: conversations.title,
        updatedAt: conversations.updatedAt,
        subjectId: conversations.subjectId,
        subjectName: subjectsTable.name,
      })
      .from(conversations)
      .leftJoin(subjectsTable, eq(subjectsTable.id, conversations.subjectId))
      .where(eq(conversations.userId, session.user.id))
      .orderBy(desc(conversations.updatedAt))
      .limit(1);
    recentConversation = rows[0] ?? null;
  } catch (err) {
    console.error("[dashboard] recent conversation query failed:", err);
  }

  // ── Recently indexed documents (last 24h, owner scope) ────────────────────
  let indexedDocuments: IndexedDocument[] = [];
  try {
    indexedDocuments = await db
      .select({
        resourceId: documents.resourceId,
        title: resources.title,
        subjectId: resources.subjectId,
        subjectName: subjectsTable.name,
        indexedAt: documents.indexedAt,
      })
      .from(documents)
      .innerJoin(resources, eq(resources.id, documents.resourceId))
      .leftJoin(subjectsTable, eq(subjectsTable.id, resources.subjectId))
      .where(
        and(
          eq(resources.ownerUserId, session.user.id),
          eq(documents.status, "indexed"),
          gte(documents.indexedAt, past24h),
        ),
      )
      .orderBy(desc(documents.indexedAt))
      .limit(5)
      .then((rows) =>
        rows
          .filter((r): r is IndexedDocument => r.indexedAt !== null)
          .map((r) => ({
            resourceId: r.resourceId,
            title: r.title,
            subjectId: r.subjectId,
            subjectName: r.subjectName,
            indexedAt: r.indexedAt,
          })),
      );
  } catch (err) {
    console.error("[dashboard] indexed documents query failed:", err);
  }

  // ── Continue studying: last conversation + last resource, same subject ───
  let continueStudying: ContinueStudying | null = null;
  if (recentConversation) {
    try {
      const lastResource = await db
        .select({ id: resources.id })
        .from(resources)
        .where(
          and(
            eq(resources.ownerUserId, session.user.id),
            eq(resources.subjectId, recentConversation.subjectId),
          ),
        )
        .orderBy(desc(resources.createdAt))
        .limit(1);
      continueStudying = {
        subjectId: recentConversation.subjectId,
        subjectName: recentConversation.subjectName ?? "Asignatura",
        lastConversationId: recentConversation.id,
        lastResourceId: lastResource[0]?.id ?? null,
      };
    } catch (err) {
      console.error("[dashboard] continue studying query failed:", err);
    }
  }

  // ── Cohort notices: official cohort events in next 7 days ────────────────
  let cohortNotices: CohortNotice[] = [];
  if (cohortId) {
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    try {
      cohortNotices = await db
        .select({
          id: events.id,
          title: events.title,
          startAt: events.startAt,
          kind: events.kind,
          location: events.location,
        })
        .from(events)
        .where(
          and(
            eq(events.cohortId, cohortId),
            eq(events.isOfficial, true),
            gte(events.startAt, now),
            lte(events.startAt, in7Days),
          ),
        )
        .orderBy(asc(events.startAt))
        .limit(3);
    } catch (err) {
      console.error("[dashboard] cohort notices query failed:", err);
    }
  }

  return {
    upcomingEvents: upcomingRows,
    pendingTasks: taskRows.filter(
      (t): t is PendingTask & { status: "todo" | "doing" } =>
        t.status === "todo" || t.status === "doing",
    ),
    recentConversation,
    indexedDocuments,
    continueStudying,
    cohortNotices,
    ready: true,
  };
}
