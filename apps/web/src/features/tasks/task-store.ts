"use client";

import { useCallback, useSyncExternalStore } from "react";

import { mockInitialTasks } from "./mock-tasks";
import type { Task, TaskStatus } from "./types";

const STORAGE_KEY = "academic_os.tasks";
const BROADCAST = "academic_os:tasks_changed";

type Store = Record<string, Task>;

const SERVER_SNAPSHOT: Store = Object.freeze(
  Object.fromEntries(mockInitialTasks.map((t) => [t.id, t])),
) as Store;

let cachedClientSnapshot: Store | null = null;

function readFresh(): Store {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const s: Store = { ...SERVER_SNAPSHOT };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      return s;
    }
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Store) : { ...SERVER_SNAPSHOT };
  } catch {
    return { ...SERVER_SNAPSHOT };
  }
}

function getSnapshot(): Store {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  if (cachedClientSnapshot === null) cachedClientSnapshot = readFresh();
  return cachedClientSnapshot;
}

function getServerSnapshot(): Store {
  return SERVER_SNAPSHOT;
}

function write(next: Store): void {
  cachedClientSnapshot = next;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(BROADCAST));
}

function subscribe(listener: () => void): () => void {
  const onChange = (): void => {
    cachedClientSnapshot = null;
    listener();
  };
  window.addEventListener(BROADCAST, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(BROADCAST, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useTasks(): Task[] {
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
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
    const current = readFresh();
    write({ ...current, [id]: task });
    return task;
  }, []);

  const update = useCallback((id: string, patch: Partial<Omit<Task, "id">>) => {
    const current = readFresh();
    const existing = current[id];
    if (!existing) return;
    write({ ...current, [id]: { ...existing, ...patch } });
  }, []);

  const setStatus = useCallback((id: string, status: TaskStatus) => {
    update(id, { status });
  }, [update]);

  const remove = useCallback((id: string) => {
    const current = readFresh();
    const { [id]: _removed, ...rest } = current;
    write(rest);
  }, []);

  return { create, update, setStatus, remove };
}
