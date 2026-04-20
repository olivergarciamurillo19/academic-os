"use server";

import { db, subjects, tasks } from "@academic-os/db";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";

import type { Task, TaskPriority, TaskStatus } from "@/features/tasks/types";

type DbTaskStatus = "todo" | "doing" | "done" | "archived";

function dbPriorityFor(p: TaskPriority): number {
  if (p === "high") return 2;
  if (p === "normal") return 1;
  return 0;
}

function priorityFromDb(n: number): TaskPriority {
  if (n >= 2) return "high";
  if (n === 1) return "normal";
  return "low";
}

interface DbTaskRow {
  id: string;
  userId: string;
  subjectId: string | null;
  title: string;
  status: DbTaskStatus;
  priority: number;
  dueAt: Date | null;
  createdAt: Date;
}

function rowToTask(row: DbTaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    subjectId: row.subjectId,
    status: row.status === "archived" ? "done" : (row.status as TaskStatus),
    priority: priorityFromDb(row.priority),
    dueISO: row.dueAt ? row.dueAt.toISOString() : undefined,
    createdAtISO: row.createdAt.toISOString(),
  };
}

export async function listTasks(): Promise<Task[]> {
  const session = await getSessionUser();
  if (!session) return [];
  const rows = await db
    .select({
      id: tasks.id,
      userId: tasks.userId,
      subjectId: tasks.subjectId,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueAt: tasks.dueAt,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .where(and(eq(tasks.userId, session.user.id), ne(tasks.status, "archived")))
    .orderBy(asc(tasks.dueAt), desc(tasks.createdAt));
  return rows.map(rowToTask);
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  subjectId: z.string().uuid().nullable().optional(),
  status: z.enum(["todo", "doing", "done"]).default("todo"),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  dueISO: z.string().datetime({ offset: true }).optional().nullable(),
});

export type CreateTaskInput = z.infer<typeof createSchema>;

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const session = await getSessionUser();
  if (!session) throw new Error("No autenticado");
  const parsed = createSchema.parse(input);

  // Validate subject ownership if provided.
  if (parsed.subjectId) {
    const [s] = await db
      .select({ id: subjects.id })
      .from(subjects)
      .where(eq(subjects.id, parsed.subjectId))
      .limit(1);
    if (!s) throw new Error("Asignatura no encontrada");
  }

  const [inserted] = await db
    .insert(tasks)
    .values({
      userId: session.user.id,
      title: parsed.title,
      subjectId: parsed.subjectId ?? null,
      status: parsed.status,
      priority: dbPriorityFor(parsed.priority),
      dueAt: parsed.dueISO ? new Date(parsed.dueISO) : null,
    })
    .returning({
      id: tasks.id,
      userId: tasks.userId,
      subjectId: tasks.subjectId,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueAt: tasks.dueAt,
      createdAt: tasks.createdAt,
    });
  if (!inserted) throw new Error("Insert falló");
  return rowToTask(inserted);
}

const updateSchema = z.object({
  id: z.string().uuid(),
  patch: z.object({
    title: z.string().min(1).max(200).optional(),
    subjectId: z.string().uuid().nullable().optional(),
    status: z.enum(["todo", "doing", "done"]).optional(),
    priority: z.enum(["low", "normal", "high"]).optional(),
    dueISO: z.string().datetime({ offset: true }).nullable().optional(),
  }),
});

export async function updateTask(
  input: z.infer<typeof updateSchema>,
): Promise<Task> {
  const session = await getSessionUser();
  if (!session) throw new Error("No autenticado");
  const parsed = updateSchema.parse(input);

  const patch: Partial<typeof tasks.$inferInsert> = {};
  if (parsed.patch.title !== undefined) patch.title = parsed.patch.title;
  if (parsed.patch.subjectId !== undefined) patch.subjectId = parsed.patch.subjectId;
  if (parsed.patch.status !== undefined) {
    patch.status = parsed.patch.status;
    patch.completedAt = parsed.patch.status === "done" ? new Date() : null;
  }
  if (parsed.patch.priority !== undefined) patch.priority = dbPriorityFor(parsed.patch.priority);
  if (parsed.patch.dueISO !== undefined) {
    patch.dueAt = parsed.patch.dueISO ? new Date(parsed.patch.dueISO) : null;
  }

  const [updated] = await db
    .update(tasks)
    .set(patch)
    .where(and(eq(tasks.id, parsed.id), eq(tasks.userId, session.user.id)))
    .returning({
      id: tasks.id,
      userId: tasks.userId,
      subjectId: tasks.subjectId,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueAt: tasks.dueAt,
      createdAt: tasks.createdAt,
    });
  if (!updated) throw new Error("Tarea no encontrada");
  return rowToTask(updated);
}

export async function deleteTask(id: string): Promise<{ id: string }> {
  const session = await getSessionUser();
  if (!session) throw new Error("No autenticado");
  z.string().uuid().parse(id);
  const [updated] = await db
    .update(tasks)
    .set({ status: "archived" })
    .where(and(eq(tasks.id, id), eq(tasks.userId, session.user.id)))
    .returning({ id: tasks.id });
  if (!updated) throw new Error("Tarea no encontrada");
  return { id: updated.id };
}
