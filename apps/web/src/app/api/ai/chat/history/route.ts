import { conversations, db, messages } from "@academic-os/db";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  subjectId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
});

export async function GET(request: Request): Promise<Response> {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    subjectId: url.searchParams.get("subjectId"),
    conversationId: url.searchParams.get("conversationId") ?? undefined,
  });
  if (!parsed.success) return Response.json({ error: "Invalid query" }, { status: 400 });

  if (parsed.data.conversationId) {
    const msgs = await db
      .select({
        id: messages.id,
        role: messages.role,
        content: messages.content,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(eq(messages.conversationId, parsed.data.conversationId))
      .orderBy(asc(messages.createdAt));
    return Response.json({ messages: msgs });
  }

  const convos = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.userId, session.user.id),
        eq(conversations.subjectId, parsed.data.subjectId),
      ),
    )
    .orderBy(desc(conversations.updatedAt))
    .limit(30);
  return Response.json({ conversations: convos });
}
