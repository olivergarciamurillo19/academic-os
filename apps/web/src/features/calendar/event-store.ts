"use client";

import { useCallback, useSyncExternalStore } from "react";

import { mockInitialEvents } from "./mock-events";
import type { CalendarEvent } from "./types";

const STORAGE_KEY = "academic_os.calendar_events";
const BROADCAST = "academic_os:calendar_events_changed";

type Store = Record<string, CalendarEvent>;

const SERVER_SNAPSHOT: Store = Object.freeze(
  Object.fromEntries(mockInitialEvents.map((e) => [e.id, e])),
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

export function useCalendarEvents(): CalendarEvent[] {
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return Object.values(store).sort((a, b) => a.startISO.localeCompare(b.startISO));
}

export function useCalendarActions(): {
  upsert: (event: CalendarEvent) => void;
  remove: (id: string) => void;
} {
  const upsert = useCallback((event: CalendarEvent) => {
    const current = readFresh();
    write({ ...current, [event.id]: event });
  }, []);
  const remove = useCallback((id: string) => {
    const current = readFresh();
    const { [id]: _removed, ...rest } = current;
    write(rest);
  }, []);
  return { upsert, remove };
}

export function newEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `evt_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}
