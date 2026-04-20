import "server-only";

import {
  conversations,
  db,
  events,
  subjects as subjectsTable,
  tasks,
} from "@academic-os/db";
import { and, asc, desc, eq, gte, or } from "drizzle-orm";

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

export interface DashboardData {
  upcomingEvents: readonly UpcomingEvent[];
  pendingTasks: readonly PendingTask[];
  recentConversation: RecentConversation | null;
  ready: boolean;
}

const EMPTY: DashboardData = {
  upcomingEvents: [],
  pendingTasks: [],
  recentConversation: null,
  ready: false,
};

export async function loadDashboardData(): Promise<DashboardData> {
  if (!isSupabaseConfigured()) return EMPTY;
  const session = await getSessionUser();
  if (!session) return EMPTY;
  const cohortId = await getActiveCohortId();

  const now = new Date();

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
      .where(and(scope, gte(events.startAt, now)))
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

  return {
    upcomingEvents: upcomingRows,
    pendingTasks: taskRows.filter(
      (t): t is PendingTask & { status: "todo" | "doing" } =>
        t.status === "todo" || t.status === "doing",
    ),
    recentConversation,
    ready: true,
  };
}
