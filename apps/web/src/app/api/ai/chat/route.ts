import { conversations, db, messages, subjects as subjectsTable } from "@academic-os/db";
import Anthropic from "@anthropic-ai/sdk";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const chatBodySchema = z.object({
  conversationId: z.string().uuid().optional(),
  subjectId: z.string().uuid(),
  message: z.string().min(1).max(8000),
});

const MODEL = "claude-sonnet-4-5";
const MAX_TOKENS = 1500;

const SYSTEM_PROMPT = (subjectName: string): string => `Eres un tutor académico del alumno para la asignatura "${subjectName}" en la Universidad de Almería. Responde en español, con explicaciones claras y ejemplos numéricos cuando apliquen. Usa Markdown: negritas para términos clave, listas para pasos, bloques de código para notación. Si no estás seguro, dilo.`;

export async function POST(request: Request): Promise<Response> {
  const session = await getSessionUser();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = chatBodySchema.parse(await request.json());
  } catch (err) {
    return Response.json(
      { error: "Invalid body", detail: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }

  // Verify the subject belongs to a cohort the user is in (RLS is the real
  // enforcer; this is an early-exit).
  const subjectRow = await db
    .select({ id: subjectsTable.id, name: subjectsTable.name })
    .from(subjectsTable)
    .where(eq(subjectsTable.id, parsed.subjectId))
    .limit(1);
  const subject = subjectRow[0];
  if (!subject) {
    return Response.json({ error: "Subject not found" }, { status: 404 });
  }

  // Upsert conversation.
  let conversationId = parsed.conversationId ?? null;
  if (!conversationId) {
    const [created] = await db
      .insert(conversations)
      .values({
        userId: session.user.id,
        subjectId: parsed.subjectId,
        title: parsed.message.slice(0, 48),
      })
      .returning({ id: conversations.id });
    conversationId = created?.id ?? null;
  }
  if (!conversationId) {
    return Response.json({ error: "Could not create conversation" }, { status: 500 });
  }

  // Persist the user turn.
  await db.insert(messages).values({
    conversationId,
    role: "user",
    content: { text: parsed.message },
  });

  // Load recent history (including the just-inserted user message).
  const history = await db
    .select({ role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  const anthropicHistory = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => {
      const text =
        m.content && typeof m.content === "object" && "text" in m.content
          ? String((m.content as { text: string }).text)
          : "";
      return {
        role: m.role as "user" | "assistant",
        content: text,
      };
    });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const encoder = new TextEncoder();

  // ── Mock path when ANTHROPIC_API_KEY is missing ───────────────────────────
  if (!apiKey) {
    const mock = `_(modo mock — añade \`ANTHROPIC_API_KEY\` en Vercel para respuestas reales de Claude Sonnet 4.5)._

Esta es una respuesta de ejemplo sobre **${subject.name}**. Dime qué tema quieres repasar y te contesto con citas en cuanto tenga retrieval contra tus apuntes.`;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        for (let i = 0; i < mock.length; i += 4) {
          controller.enqueue(encoder.encode(mock.slice(i, i + 4)));
          await new Promise((r) => setTimeout(r, 18));
        }
        await db.insert(messages).values({
          conversationId,
          role: "assistant",
          content: { text: mock },
          model: "mock",
        });
        await db
          .update(conversations)
          .set({ updatedAt: new Date() })
          .where(eq(conversations.id, conversationId));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Conversation-Id": conversationId,
        "Cache-Control": "no-store",
      },
    });
  }

  // ── Real Anthropic streaming ──────────────────────────────────────────────
  const client = new Anthropic({ apiKey });
  const anthropicStream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT(subject.name),
    messages: anthropicHistory,
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let fullText = "";
      let inputTokens = 0;
      let outputTokens = 0;
      try {
        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const delta = event.delta.text;
            fullText += delta;
            controller.enqueue(encoder.encode(delta));
          } else if (event.type === "message_delta" && event.usage) {
            outputTokens = event.usage.output_tokens;
          } else if (event.type === "message_start" && event.message.usage) {
            inputTokens = event.message.usage.input_tokens;
          }
        }
      } catch (err) {
        console.error("[api/ai/chat] anthropic stream error:", err);
        controller.error(err);
        return;
      }

      // Persist the assistant turn + refresh conversation.updatedAt.
      await db.insert(messages).values({
        conversationId,
        role: "assistant",
        content: { text: fullText },
        model: MODEL,
        tokenUsage: { input: inputTokens, output: outputTokens },
      });
      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(
          and(eq(conversations.id, conversationId), eq(conversations.userId, session.user.id)),
        );

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Conversation-Id": conversationId,
      "Cache-Control": "no-store",
    },
  });
}
