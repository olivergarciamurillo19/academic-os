"use server";

import { conversations, db, messages } from "@academic-os/db";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";

import type { ChatMessage, Conversation } from "@/features/chat/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface MsgRow {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: unknown;
  citations: unknown;
  createdAt: Date;
}

function rowToMessage(row: MsgRow): ChatMessage | null {
  if (row.role !== "user" && row.role !== "assistant") return null;
  const body = row.content as { text?: string } | null;
  const citations = Array.isArray(row.citations)
    ? (row.citations as Array<{ chunkId?: string; snippet?: string }>).map(
        (c, i) => ({
          id: i + 1,
          resourceName: c.snippet ?? "Fuente",
        }),
      )
    : undefined;
  return {
    id: row.id,
    role: row.role,
    content: body?.text ?? "",
    createdAtISO: row.createdAt.toISOString(),
    citations: citations && citations.length > 0 ? citations : undefined,
  };
}

export async function listConversations(
  subjectId: string,
): Promise<Conversation[]> {
  const session = await getSessionUser();
  if (!session || !UUID.test(subjectId)) return [];
  const convRows = await db
    .select({
      id: conversations.id,
      subjectId: conversations.subjectId,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.userId, session.user.id),
        eq(conversations.subjectId, subjectId),
      ),
    )
    .orderBy(desc(conversations.updatedAt));
  return convRows.map((c) => ({
    id: c.id,
    subjectId: c.subjectId,
    title: c.title,
    createdAtISO: c.createdAt.toISOString(),
    updatedAtISO: c.updatedAt.toISOString(),
    messages: [],
  }));
}

export async function getConversation(
  conversationId: string,
): Promise<Conversation | null> {
  const session = await getSessionUser();
  if (!session || !UUID.test(conversationId)) return null;
  const [conv] = await db
    .select({
      id: conversations.id,
      subjectId: conversations.subjectId,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, session.user.id),
      ),
    )
    .limit(1);
  if (!conv) return null;
  const msgRows = await db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      citations: messages.citations,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, conv.id))
    .orderBy(asc(messages.createdAt));
  return {
    id: conv.id,
    subjectId: conv.subjectId,
    title: conv.title,
    createdAtISO: conv.createdAt.toISOString(),
    updatedAtISO: conv.updatedAt.toISOString(),
    messages: msgRows.map(rowToMessage).filter((m): m is ChatMessage => m !== null),
  };
}

const createSchema = z.object({
  subjectId: z.string().uuid(),
  title: z.string().min(1).max(240),
});

export async function createConversation(
  input: z.infer<typeof createSchema>,
): Promise<Conversation> {
  const session = await getSessionUser();
  if (!session) throw new Error("No autenticado");
  const parsed = createSchema.parse(input);
  const [row] = await db
    .insert(conversations)
    .values({
      userId: session.user.id,
      subjectId: parsed.subjectId,
      title: parsed.title,
    })
    .returning({
      id: conversations.id,
      subjectId: conversations.subjectId,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    });
  if (!row) throw new Error("Insert falló");
  return {
    id: row.id,
    subjectId: row.subjectId,
    title: row.title,
    createdAtISO: row.createdAt.toISOString(),
    updatedAtISO: row.updatedAt.toISOString(),
    messages: [],
  };
}

const saveMessageSchema = z.object({
  conversationId: z.string().uuid(),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

export async function saveMessage(
  input: z.infer<typeof saveMessageSchema>,
): Promise<{ id: string }> {
  const session = await getSessionUser();
  if (!session) throw new Error("No autenticado");
  const parsed = saveMessageSchema.parse(input);
  const [owner] = await db
    .select({ userId: conversations.userId })
    .from(conversations)
    .where(eq(conversations.id, parsed.conversationId))
    .limit(1);
  if (!owner || owner.userId !== session.user.id) {
    throw new Error("Conversación no encontrada");
  }
  const [row] = await db
    .insert(messages)
    .values({
      conversationId: parsed.conversationId,
      role: parsed.role,
      content: { text: parsed.content },
    })
    .returning({ id: messages.id });
  if (!row) throw new Error("Message insert falló");
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, parsed.conversationId));
  return { id: row.id };
}

export async function renameConversation(
  input: { id: string; title: string },
): Promise<void> {
  const session = await getSessionUser();
  if (!session) throw new Error("No autenticado");
  const parsed = z
    .object({ id: z.string().uuid(), title: z.string().min(1).max(240) })
    .parse(input);
  await db
    .update(conversations)
    .set({ title: parsed.title, updatedAt: new Date() })
    .where(
      and(
        eq(conversations.id, parsed.id),
        eq(conversations.userId, session.user.id),
      ),
    );
}

export async function deleteConversation(
  id: string,
): Promise<{ id: string }> {
  const session = await getSessionUser();
  if (!session) throw new Error("No autenticado");
  z.string().uuid().parse(id);
  const rows = await db
    .delete(conversations)
    .where(
      and(eq(conversations.id, id), eq(conversations.userId, session.user.id)),
    )
    .returning({ id: conversations.id });
  if (rows.length === 0) throw new Error("Conversación no encontrada");
  return { id };
}
