import { conversations, db, messages, subjects as subjectsTable } from "@academic-os/db";
import { and, asc, eq } from "drizzle-orm";
import OpenAI from "openai";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { formatContextForPrompt, retrieveChunks, type RetrievedChunk } from "@/lib/rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const chatBodySchema = z.object({
  conversationId: z.string().uuid().optional(),
  subjectId: z.string().uuid(),
  topicId: z.string().uuid().optional(),
  message: z.string().min(1).max(8000),
});

// Claude Sonnet 4.5 is the target per the blueprint; temporarily served by
// OpenAI until an ANTHROPIC_API_KEY lands. Model choice is env-configurable.
const OPENAI_MODEL = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";
const MAX_TOKENS = 1500;
const HISTORY_WINDOW = 12;

function systemPrompt(subjectName: string, context: string): string {
  const base = `Eres un tutor académico del alumno para la asignatura "${subjectName}" en la Universidad de Almería. Responde en español, con explicaciones claras y ejemplos numéricos cuando apliquen. Usa Markdown: negritas para términos clave, listas para pasos, bloques de código para notación. Si no estás seguro, dilo.`;
  if (context.length === 0) return base;
  return `${base}

Dispones de los siguientes extractos de los apuntes y materiales del alumno. Úsalos como fuente principal. Cuando los uses, cita con [n] (ej. [1] [3]) al final de la frase relevante. Si ninguno responde la pregunta, dilo claramente y responde con conocimiento general.

--- CONTEXTO ---
${context}
--- FIN CONTEXTO ---`;
}

export async function POST(request: Request): Promise<Response> {
  const session = await getSessionUser();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed: z.infer<typeof chatBodySchema>;
  try {
    parsed = chatBodySchema.parse(await request.json());
  } catch (err) {
    return Response.json(
      { error: "Invalid body", detail: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }

  const subjectRow = await db
    .select({ id: subjectsTable.id, name: subjectsTable.name })
    .from(subjectsTable)
    .where(eq(subjectsTable.id, parsed.subjectId))
    .limit(1);
  const subject = subjectRow[0];
  if (!subject) {
    return Response.json({ error: "Subject not found" }, { status: 404 });
  }

  // ── Retrieve context chunks (hybrid search) ───────────────────────────────
  const retrieved: RetrievedChunk[] = await retrieveChunks({
    query: parsed.message,
    subjectId: parsed.subjectId,
    topicId: parsed.topicId,
  });
  const context = formatContextForPrompt(retrieved);
  const citations = retrieved.map((c) => ({
    chunkId: c.chunkId,
    snippet: c.content.slice(0, 240),
    resourceId: c.resourceId,
    resourceTitle: c.resourceTitle,
    pageFrom: c.pageFrom,
    pageTo: c.pageTo,
  }));

  // ── Upsert conversation ───────────────────────────────────────────────────
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

  await db.insert(messages).values({
    conversationId,
    role: "user",
    content: { text: parsed.message },
  });

  // Load last N turns for memory (ascending by createdAt, then keep tail).
  const allHistory = await db
    .select({ role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  const history = allHistory.slice(-HISTORY_WINDOW);

  const openaiHistory: { role: "user" | "assistant"; content: string }[] = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => {
      const text =
        m.content && typeof m.content === "object" && "text" in m.content
          ? String((m.content as { text: string }).text)
          : "";
      return { role: m.role as "user" | "assistant", content: text };
    });

  const apiKey = process.env.OPENAI_API_KEY;
  const encoder = new TextEncoder();

  // ── Mock path ─────────────────────────────────────────────────────────────
  if (!apiKey) {
    const mock = `_(modo mock — falta \`OPENAI_API_KEY\` en este entorno)._

Esta es una respuesta de ejemplo sobre **${subject.name}**. Dime qué tema quieres repasar y cuando configures el LLM te contesto con citas de tus apuntes.`;
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
        "X-Citations": citations.length > 0 ? encodeCitationsHeader(citations) : "",
        "Cache-Control": "no-store",
      },
    });
  }

  // ── Real OpenAI streaming ─────────────────────────────────────────────────
  const openai = new OpenAI({ apiKey });
  const openaiStream = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    stream: true,
    max_tokens: MAX_TOKENS,
    messages: [
      { role: "system", content: systemPrompt(subject.name, context) },
      ...openaiHistory,
    ],
    stream_options: { include_usage: true },
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let fullText = "";
      let inputTokens = 0;
      let outputTokens = 0;
      try {
        for await (const chunk of openaiStream) {
          const delta = chunk.choices[0]?.delta.content ?? "";
          if (delta) {
            fullText += delta;
            controller.enqueue(encoder.encode(delta));
          }
          if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens;
            outputTokens = chunk.usage.completion_tokens;
          }
        }
      } catch (err) {
        console.error("[api/ai/chat] openai stream error:", err);
        controller.error(err);
        return;
      }

      await db.insert(messages).values({
        conversationId,
        role: "assistant",
        content: { text: fullText },
        citations: citations.length > 0 ? citations : null,
        model: OPENAI_MODEL,
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
      "X-Citations": citations.length > 0 ? encodeCitationsHeader(citations) : "",
      "Cache-Control": "no-store",
    },
  });
}

function encodeCitationsHeader(
  citations: {
    chunkId: string;
    snippet: string;
    resourceId: string;
    resourceTitle: string | null;
    pageFrom: number | null;
    pageTo: number | null;
  }[],
): string {
  // Base64url-encode the JSON so HTTP header rules (token-only chars) hold.
  const json = JSON.stringify(citations);
  return Buffer.from(json, "utf8").toString("base64url");
}
