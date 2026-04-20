"use client";

import { useCallback, useSyncExternalStore } from "react";

import { mockInitialTasks } from "./mock-tasks";
import type { Task, TaskStatus } from "./types";

const STORAGE_KEY = "academic_os.tasks";
const BROADCAST = "academic_os:tasks_changed";

type Store = Record<string, Task>;

function seed(): Store {
  return Object.fromEntries(mockInitialTasks.map((t) => [t.id, t]));
}

function read(): Store {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const s = seed();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      return s;
    }
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Store) : seed();
  } catch {
    return seed();
  }
}

function write(next: Store): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(BROADCAST));
}

function subscribe(listener: () => void): () => void {
  window.addEventListener(BROADCAST, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(BROADCAST, listener);
    window.removeEventListener("storage", listener);
  };
}

export function useTasks(): Task[] {
  const store = useSyncExternalStore(
    subscribe,
    () => read(),
    () => seed(),
  );
  return Object.values(store).sort((a, b) => a.createdAtISO.localeCompare(b.createdAtISO));
}

export function useTaskActions(): {
  create: (input: Omit<Task, "id" | "createdAtISO">) => Task;
  update: (id: string, patch: Partial<Omit<Task, "id">>) => void;
  setStatus: (id: string, status: TaskStatus) => void;
  remove: (id: string) => void;
} {
  const create = useCallback((input: Omit<Task, "id" | "createdAtISO">) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `task_${Math.random().toString(36).slice(2)}`;
    const task: Task = { ...input, id, createdAtISO: new Date().toISOString() };
    const current = read();
    write({ ...current, [id]: task });
    return task;
  }, []);

  const update = useCallback((id: string, patch: Partial<Omit<Task, "id">>) => {
    const current = read();
    const existing = current[id];
    if (!existing) return;
    write({ ...current, [id]: { ...existing, ...patch } });
  }, []);

  const setStatus = useCallback((id: string, status: TaskStatus) => {
    update(id, { status });
  }, [update]);

  const remove = useCallback((id: string) => {
    const current = read();
    const { [id]: _removed, ...rest } = current;
    write(rest);
  }, []);

  return { create, update, setStatus, remove };
}
