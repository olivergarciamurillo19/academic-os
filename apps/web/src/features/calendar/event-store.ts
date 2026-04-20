"use client";

import { useCallback, useSyncExternalStore } from "react";

import { mockInitialEvents } from "./mock-events";
import type { CalendarEvent } from "./types";

const STORAGE_KEY = "academic_os.calendar_events";
const BROADCAST = "academic_os:calendar_events_changed";

type Store = Record<string, CalendarEvent>;

function seed(): Store {
  return Object.fromEntries(mockInitialEvents.map((e) => [e.id, e]));
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

export function useCalendarEvents(): CalendarEvent[] {
  const store = useSyncExternalStore(
    subscribe,
    () => read(),
    () => seed(),
  );
  return Object.values(store).sort((a, b) => a.startISO.localeCompare(b.startISO));
}

export function useCalendarActions(): {
  upsert: (event: CalendarEvent) => void;
  remove: (id: string) => void;
} {
  const upsert = useCallback((event: CalendarEvent) => {
    const current = read();
    write({ ...current, [event.id]: event });
  }, []);
  const remove = useCallback((id: string) => {
    const current = read();
    const { [id]: _removed, ...rest } = current;
    write(rest);
  }, []);
  return { upsert, remove };
}

export function newEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `evt_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}
