"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";

import {
  createConversation as createConversationAction,
  deleteConversation as deleteConversationAction,
  getConversation as getConversationAction,
  listConversations as listConversationsAction,
  saveMessage as saveMessageAction,
} from "@/actions/conversations";

import type { ChatMessage, Conversation } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const listKey = (subjectId: string) => ["conversations", subjectId] as const;
const detailKey = (id: string) => ["conversation", id] as const;

export function useConversations(subjectId: string): Conversation[] {
  const q = useQuery({
    queryKey: listKey(subjectId),
    queryFn: () => listConversationsAction(subjectId),
    staleTime: 30_000,
    initialData: [],
    enabled: UUID.test(subjectId),
  });
  return q.data;
}

export function useConversation(id: string | null): Conversation | null {
  const q = useQuery({
    queryKey: detailKey(id ?? "none"),
    queryFn: async () => (id ? getConversationAction(id) : null),
    staleTime: 30_000,
    enabled: Boolean(id) && UUID.test(id ?? ""),
  });
  return q.data ?? null;
}

function patchDetail(
  qc: QueryClient,
  id: string,
  updater: (prev: Conversation | null) => Conversation | null,
): Conversation | null {
  const prev = qc.getQueryData<Conversation | null>(detailKey(id)) ?? null;
  const next = updater(prev);
  qc.setQueryData(detailKey(id), next);
  return prev;
}

function patchList(
  qc: QueryClient,
  subjectId: string,
  updater: (prev: Conversation[]) => Conversation[],
): Conversation[] {
  const prev = qc.getQueryData<Conversation[]>(listKey(subjectId)) ?? [];
  qc.setQueryData(listKey(subjectId), updater(prev));
  return prev;
}

export function useChatActions(): {
  createConversation: (
    subjectId: string,
    title: string,
  ) => Promise<Conversation>;
  appendMessage: (conversationId: string, message: ChatMessage) => void;
  patchMessage: (
    conversationId: string,
    messageId: string,
    patch: Partial<Pick<ChatMessage, "content" | "streaming" | "citations">>,
  ) => void;
  deleteConversation: (id: string) => Promise<void>;
} {
  const qc = useQueryClient();

  const createMut = useMutation({
    mutationFn: async (input: { subjectId: string; title: string }) =>
      createConversationAction(input),
    onSuccess: (conv) => {
      patchList(qc, conv.subjectId, (list) => [conv, ...list]);
      qc.setQueryData(detailKey(conv.id), conv);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "No se pudo crear la conversación");
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteConversationAction(id),
    onSuccess: (_result, id) => {
      const detail = qc.getQueryData<Conversation | null>(detailKey(id));
      if (detail) {
        patchList(qc, detail.subjectId, (list) => list.filter((c) => c.id !== id));
      }
      qc.removeQueries({ queryKey: detailKey(id) });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "No se pudo borrar la conversación");
    },
  });

  const createConversation = useCallback(
    async (subjectId: string, title: string) => {
      return createMut.mutateAsync({ subjectId, title });
    },
    [createMut],
  );

  const appendMessage = useCallback(
    (conversationId: string, message: ChatMessage) => {
      patchDetail(qc, conversationId, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...prev.messages, message],
          updatedAtISO: new Date().toISOString(),
          title:
            prev.messages.length === 0 && message.role === "user"
              ? message.content.slice(0, 48)
              : prev.title,
        };
      });
      // Persist user messages immediately; assistant messages are persisted
      // via patchMessage when streaming: false.
      if (message.role === "user" && UUID.test(conversationId) && message.content.length > 0) {
        void saveMessageAction({
          conversationId,
          role: "user",
          content: message.content,
        }).catch(() => {
          // Silent — stays in cache; user can still see message on this tab.
        });
      }
    },
    [qc],
  );

  const patchMessage = useCallback(
    (
      conversationId: string,
      messageId: string,
      patch: Partial<Pick<ChatMessage, "content" | "streaming" | "citations">>,
    ) => {
      patchDetail(qc, conversationId, (prev) => {
        if (!prev) return prev;
        const msgs = prev.messages.map((m) =>
          m.id === messageId ? { ...m, ...patch } : m,
        );
        return {
          ...prev,
          messages: msgs,
          updatedAtISO: new Date().toISOString(),
        };
      });
      if (patch.streaming === false && UUID.test(conversationId)) {
        const conv = qc.getQueryData<Conversation | null>(detailKey(conversationId));
        const msg = conv?.messages.find((m) => m.id === messageId);
        if (msg?.role === "assistant" && msg.content.length > 0) {
          void saveMessageAction({
            conversationId,
            role: "assistant",
            content: msg.content,
          }).catch(() => {
            /* cache-only */
          });
        }
      }
    },
    [qc],
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      await deleteMut.mutateAsync(id);
    },
    [deleteMut],
  );

  return {
    createConversation,
    appendMessage,
    patchMessage,
    deleteConversation,
  };
}
