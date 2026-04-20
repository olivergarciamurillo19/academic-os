"use client";

import { Menu, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { MockSubject } from "@/features/subjects/mock-data";
import { track } from "@/lib/analytics";

import { ChatInput, type ChatInputHandle } from "./chat-input";
import { useChatActions, useConversation, useConversations } from "./chat-store";
import { ConversationList } from "./conversation-list";
import { MessageBubble } from "./message-bubble";
import { mockAnswer } from "./mock-response";
import type { ChatMessage } from "./types";

interface SubjectChatProps {
  subject: MockSubject;
}

function newMsgId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `msg_${Math.random().toString(36).slice(2)}`;
}

export function SubjectChat({ subject }: SubjectChatProps) {
  const conversations = useConversations(subject.id);
  const [activeId, setActiveId] = useState<string | null>(conversations[0]?.id ?? null);
  const active = useConversation(activeId);
  const { createConversation, appendMessage, patchMessage, deleteConversation } = useChatActions();
  const inputRef = useRef<ChatInputHandle>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [streamingLock, setStreamingLock] = useState(false);

  useEffect(() => {
    // Auto-select first conversation if none is active.
    if (activeId === null && conversations.length > 0) {
      setActiveId(conversations[0]?.id ?? null);
    }
  }, [activeId, conversations]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [active?.messages.length]);

  function handleNew() {
    const convo = createConversation(subject.id, "Nueva conversación");
    setActiveId(convo.id);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function handleSend(text: string) {
    let convoId = activeId;
    if (!convoId) {
      const convo = createConversation(subject.id, text.slice(0, 48));
      convoId = convo.id;
      setActiveId(convo.id);
    }

    const userMsg: ChatMessage = {
      id: newMsgId(),
      role: "user",
      content: text,
      createdAtISO: new Date().toISOString(),
    };
    appendMessage(convoId, userMsg);
    track({
      name: "chat_message_sent",
      payload: { subjectId: subject.id, characters: text.length },
    });

    const assistantId = newMsgId();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAtISO: new Date().toISOString(),
      streaming: true,
    };
    appendMessage(convoId, assistantMsg);

    setStreamingLock(true);
    try {
      const { content, citations } = mockAnswer(subject.name);
      await streamInto((chunk) => {
        patchMessage(convoId, assistantId, { content: chunk });
      }, content);
      patchMessage(convoId, assistantId, { streaming: false, citations });
    } finally {
      setStreamingLock(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-18rem)] min-h-[520px] overflow-hidden rounded-xl border bg-background md:h-[calc(100dvh-16rem)]">
      <aside className="hidden w-64 shrink-0 md:block">
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={setActiveId}
          onNew={handleNew}
          onDelete={(id) => {
            deleteConversation(id);
            if (id === activeId) setActiveId(null);
          }}
        />
      </aside>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 border-b bg-background px-3 py-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Conversaciones" className="md:hidden">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <ConversationList
                conversations={conversations}
                activeId={activeId}
                onSelect={(id) => setActiveId(id)}
                onNew={handleNew}
                onDelete={(id) => {
                  deleteConversation(id);
                  if (id === activeId) setActiveId(null);
                }}
              />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Chat IA · {subject.name}
          </div>
          <div className="w-8" />
        </div>

        <div
          ref={scrollRef}
          className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
          aria-live="polite"
        >
          {!active || active.messages.length === 0 ? (
            <EmptyState subjectName={subject.name} />
          ) : (
            active.messages.map((m) => <MessageBubble key={m.id} message={m} />)
          )}
        </div>

        <div className="border-t bg-background p-3">
          <ChatInput ref={inputRef} onSend={(t) => void handleSend(t)} disabled={streamingLock} />
          <p className="mt-1 text-[10px] text-muted-foreground">
            Mock: respuestas fijas. Streaming real cuando Armando conecte `/api/ai/chat`.
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ subjectName }: { subjectName: string }) {
  return (
    <div className="m-auto flex max-w-md flex-col items-center gap-2 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="h-5 w-5" />
      </span>
      <p className="text-base font-semibold">Pregúntame sobre {subjectName}</p>
      <p className="text-sm text-muted-foreground">
        Teoría, ejercicios, ejemplos o aclaraciones. Puedes citar apuntes que hayas subido.
      </p>
    </div>
  );
}

/**
 * Stream a string into a callback one "chunk" at a time to simulate LLM streaming.
 */
async function streamInto(
  onChunk: (content: string) => void,
  full: string,
  chunkSize = 4,
  delayMs = 18,
): Promise<void> {
  let acc = "";
  for (let i = 0; i < full.length; i += chunkSize) {
    acc += full.slice(i, i + chunkSize);
    onChunk(acc);
    await new Promise((r) => setTimeout(r, delayMs));
  }
}
