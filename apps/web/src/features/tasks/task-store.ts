"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createTask as createTaskAction,
  deleteTask as deleteTaskAction,
  listTasks as listTasksAction,
  updateTask as updateTaskAction,
  type CreateTaskInput,
} from "@/actions/tasks";

import type { Task, TaskPriority, TaskStatus } from "./types";

export const tasksKey = ["tasks"] as const;

export function useTasks(): Task[] {
  const q = useQuery({
    queryKey: tasksKey,
    queryFn: () => listTasksAction(),
    staleTime: 30_000,
    initialData: [],
  });
  return q.data;
}

function applyOptimistic(
  qc: QueryClient,
  updater: (prev: Task[]) => Task[],
): Task[] {
  const prev = qc.getQueryData<Task[]>(tasksKey) ?? [];
  qc.setQueryData<Task[]>(tasksKey, updater(prev));
  return prev;
}

function tempId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `temp_${Math.random().toString(36).slice(2)}`;
}

export function useTaskActions(): {
  create: (input: Omit<Task, "id" | "createdAtISO">) => Promise<Task>;
  update: (id: string, patch: Partial<Omit<Task, "id">>) => Promise<void>;
  setStatus: (id: string, status: TaskStatus) => Promise<void>;
  remove: (id: string) => Promise<void>;
} {
  const qc = useQueryClient();

  const createMut = useMutation({
    mutationFn: async (input: CreateTaskInput) => createTaskAction(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: tasksKey });
      const optimistic: Task = {
        id: tempId(),
        title: input.title,
        subjectId: input.subjectId ?? null,
        status: input.status ?? "todo",
        priority: input.priority ?? "normal",
        dueISO: input.dueISO ?? undefined,
        createdAtISO: new Date().toISOString(),
      };
      const prev = applyOptimistic(qc, (list) => [optimistic, ...list]);
      return { prev, tempId: optimistic.id };
    },
    onError: (err, _input, ctx) => {
      if (ctx?.prev) qc.setQueryData(tasksKey, ctx.prev);
      toast.error(err instanceof Error ? err.message : "No se pudo crear la tarea");
    },
    onSuccess: (real, _input, ctx) => {
      qc.setQueryData<Task[]>(tasksKey, (list) =>
        (list ?? []).map((t) => (t.id === ctx?.tempId ? real : t)),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: tasksKey }),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Omit<Task, "id">> }) => {
      return updateTaskAction({
        id,
        patch: {
          title: patch.title,
          subjectId: patch.subjectId,
          status: patch.status,
          priority: patch.priority,
          dueISO:
            patch.dueISO === undefined ? undefined : (patch.dueISO as string | null),
        },
      });
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: tasksKey });
      const prev = applyOptimistic(qc, (list) =>
        list.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(tasksKey, ctx.prev);
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: tasksKey }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteTaskAction(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: tasksKey });
      const prev = applyOptimistic(qc, (list) => list.filter((t) => t.id !== id));
      return { prev };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(tasksKey, ctx.prev);
      toast.error(err instanceof Error ? err.message : "No se pudo borrar");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: tasksKey }),
  });

  return {
    create: async (input) =>
      createMut.mutateAsync({
        title: input.title,
        subjectId: input.subjectId,
        status: input.status,
        priority: input.priority,
        dueISO: input.dueISO ?? null,
      }),
    update: async (id, patch) => {
      await updateMut.mutateAsync({ id, patch });
    },
    setStatus: async (id, status) => {
      await updateMut.mutateAsync({ id, patch: { status } });
    },
    remove: async (id) => {
      await deleteMut.mutateAsync(id);
    },
  };
}

// Re-export for callers that import types from the store module.
export type { TaskPriority, TaskStatus };
