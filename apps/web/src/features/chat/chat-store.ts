"use client";

import { useCallback, useSyncExternalStore } from "react";

import type { ChatMessage, Conversation } from "./types";

const STORAGE_KEY = "academic_os.chat";
const BROADCAST = "academic_os:chat_changed";

type Store = Record<string, Conversation>;

const EMPTY_STORE: Store = Object.freeze({}) as Store;

let cachedClientSnapshot: Store | null = null;

function readFresh(): Store {
  if (typeof window === "undefined") return EMPTY_STORE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function getSnapshot(): Store {
  if (typeof window === "undefined") return EMPTY_STORE;
  if (cachedClientSnapshot === null) cachedClientSnapshot = readFresh();
  return cachedClientSnapshot;
}

function getServerSnapshot(): Store {
  return EMPTY_STORE;
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

export function useConversations(subjectId: string): Conversation[] {
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return Object.values(store)
    .filter((c) => c.subjectId === subjectId)
    .sort((a, b) => b.updatedAtISO.localeCompare(a.updatedAtISO));
}

export function useConversation(id: string | null): Conversation | null {
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!id) return null;
  return store[id] ?? null;
}

export function useChatActions(): {
  createConversation: (subjectId: string, title: string) => Conversation;
  appendMessage: (conversationId: string, message: ChatMessage) => void;
  patchMessage: (
    conversationId: string,
    messageId: string,
    patch: Partial<Pick<ChatMessage, "content" | "streaming" | "citations">>,
  ) => void;
  deleteConversation: (id: string) => void;
} {
  const newId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  const createConversation = useCallback((subjectId: string, title: string) => {
    const now = new Date().toISOString();
    const convo: Conversation = {
      id: newId(),
      subjectId,
      title,
      createdAtISO: now,
      updatedAtISO: now,
      messages: [],
    };
    const current = readFresh();
    write({ ...current, [convo.id]: convo });
    return convo;
  }, []);

  const appendMessage = useCallback((conversationId: string, message: ChatMessage) => {
    const current = readFresh();
    const convo = current[conversationId];
    if (!convo) return;
    const next: Conversation = {
      ...convo,
      messages: [...convo.messages, message],
      updatedAtISO: new Date().toISOString(),
      title: convo.messages.length === 0 && message.role === "user" ? message.content.slice(0, 48) : convo.title,
    };
    write({ ...current, [conversationId]: next });
  }, []);

  const patchMessage = useCallback(
    (
      conversationId: string,
      messageId: string,
      patch: Partial<Pick<ChatMessage, "content" | "streaming" | "citations">>,
    ) => {
      const current = readFresh();
      const convo = current[conversationId];
      if (!convo) return;
      const msgs = convo.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m));
      write({
        ...current,
        [conversationId]: {
          ...convo,
          messages: msgs,
          updatedAtISO: new Date().toISOString(),
        },
      });
    },
    [],
  );

  const deleteConversation = useCallback((id: string) => {
    const current = readFresh();
    const { [id]: _removed, ...rest } = current;
    write(rest);
  }, []);

  return { createConversation, appendMessage, patchMessage, deleteConversation };
}
