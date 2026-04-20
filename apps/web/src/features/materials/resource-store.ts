"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import type { ResourceRecord, TopicKind } from "./types";

/**
 * Client-side mock store backed by localStorage.
 * Blob URLs live only in the current tab's memory — they are intentionally
 * not persisted because `URL.createObjectURL` results are invalid across
 * tab reloads. The file metadata persists so the UI stays consistent, and
 * the viewer shows a graceful fallback when the blob is no longer live.
 */

const STORAGE_KEY = "academic_os.mock_resources";
const BROADCAST_EVENT = "academic_os:mock_resources_changed";

type Store = Record<string, ResourceRecord>;
const blobUrlCache = new Map<string, string>();

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(next: Store): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(BROADCAST_EVENT));
}

function subscribe(listener: () => void): () => void {
  window.addEventListener(BROADCAST_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(BROADCAST_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot(): Store {
  return readStore();
}

function getServerSnapshot(): Store {
  return {};
}

export function useResources(subjectId: string, topicKind?: TopicKind): ResourceRecord[] {
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return Object.values(store)
    .filter((r) => r.subjectId === subjectId && (!topicKind || r.topicKind === topicKind))
    .sort((a, b) => (a.uploadedAtISO < b.uploadedAtISO ? 1 : -1));
}

export function useResource(resourceId: string): ResourceRecord | null {
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return store[resourceId] ?? null;
}

export function useResourceActions(): {
  addResource: (record: ResourceRecord, file?: File) => void;
  removeResource: (resourceId: string) => void;
  blobUrlFor: (resourceId: string) => string | undefined;
} {
  useEffect(() => {
    // No cleanup on unmount: blob URLs live for the tab session.
  }, []);

  const addResource = useCallback((record: ResourceRecord, file?: File) => {
    if (file) {
      const url = URL.createObjectURL(file);
      blobUrlCache.set(record.id, url);
    }
    const current = readStore();
    writeStore({ ...current, [record.id]: record });
  }, []);

  const removeResource = useCallback((resourceId: string) => {
    const cached = blobUrlCache.get(resourceId);
    if (cached) {
      URL.revokeObjectURL(cached);
      blobUrlCache.delete(resourceId);
    }
    const current = readStore();
    const { [resourceId]: _removed, ...rest } = current;
    writeStore(rest);
  }, []);

  const blobUrlFor = useCallback(
    (resourceId: string) => blobUrlCache.get(resourceId),
    [],
  );

  return { addResource, removeResource, blobUrlFor };
}
