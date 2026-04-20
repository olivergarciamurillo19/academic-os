import { chunks, db, generatedTests, subjects as subjectsTable } from "@academic-os/db";
import { and, eq, sql } from "drizzle-orm";
import OpenAI from "openai";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  subjectId: z.string().uuid(),
  topicId: z.string().uuid().optional(),
  numQuestions: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20)]),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

interface Question {
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
  sourceChunkIds: string[];
}

const questionSchema = z.object({
  question: z.string().min(4),
  options: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
  sourceChunkIds: z.array(z.string()).default([]),
});

const questionsSchema = z.object({
  questions: z.array(questionSchema).min(1),
});

const MODEL = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";

function difficultyHint(d: z.infer<typeof bodySchema>["difficulty"]): string {
  if (d === "easy") return "nivel básico, definiciones y conceptos directos";
  if (d === "medium") return "nivel medio, aplicación de conceptos con un pequeño cálculo o paso intermedio";
  return "nivel avanzado, preguntas que requieren razonamiento multi-paso, contraejemplos o casos límite";
}

export async function POST(request: Request): Promise<Response> {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch (err) {
    return Response.json(
      { error: "Invalid body", detail: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }

  // Verify subject exists & caller can see it (via RLS when enabled).
  const subj = await db
    .select({ id: subjectsTable.id, name: subjectsTable.name })
    .from(subjectsTable)
    .where(eq(subjectsTable.id, parsed.subjectId))
    .limit(1);
  if (!subj[0]) return Response.json({ error: "Subject not found" }, { status: 404 });

  // Sample indexed chunks for this subject (and topic if given). Random
  // ordering so different tests vary; cap tokens so the prompt fits.
  const sampleSize = Math.min(40, Math.max(parsed.numQuestions * 3, 12));
  const whereExpr = parsed.topicId
    ? and(eq(chunks.subjectId, parsed.subjectId), eq(chunks.topicId, parsed.topicId))
    : eq(chunks.subjectId, parsed.subjectId);

  const chunkRows = await db
    .select({
      id: chunks.id,
      content: chunks.content,
      pageFrom: chunks.pageFrom,
      pageTo: chunks.pageTo,
    })
    .from(chunks)
    .where(whereExpr)
    .orderBy(sql`random()`)
    .limit(sampleSize);

  const apiKey = process.env.OPENAI_API_KEY;

  // ── Fallback: mock questions when we have no chunks or no API key ─────────
  if (chunkRows.length === 0 || !apiKey) {
    const mock: Question[] = Array.from({ length: parsed.numQuestions }).map((_, i) => ({
      question: `Pregunta ${String(i + 1)} (${parsed.difficulty}) — pendiente de generación real.`,
      options: [
        "Opción A — correcta",
        "Opción B — distractor",
        "Opción C — distractor",
        "Opción D — distractor",
      ],
      correctIndex: 0,
      explanation:
        chunkRows.length === 0
          ? "Aún no hay apuntes indexados para esta asignatura."
          : "Explicación provisional hasta que el LLM esté configurado.",
      sourceChunkIds: [],
    }));
    return persistAndRespond(parsed, session.user.id, mock, subj[0].name);
  }

  // ── Build prompt ──────────────────────────────────────────────────────────
  const context = chunkRows
    .map((c, i) => `[${String(i + 1)}] id=${c.id}\n${c.content.trim()}`)
    .join("\n\n---\n\n");

  const systemPrompt = `Eres un generador de exámenes tipo test para estudiantes universitarios. Dada una colección de extractos de apuntes, generas preguntas de opción múltiple (4 opciones, 1 correcta) en español, ${difficultyHint(parsed.difficulty)}. Cada pregunta debe ser contestable usando SOLO los extractos proporcionados; si no hay información suficiente, no inventes. Devuelve JSON válido con el esquema exacto indicado. No añadas markdown, prefijos ni comentarios.`;

  const userPrompt = `Asignatura: ${subj[0].name}
Número de preguntas: ${String(parsed.numQuestions)}
Dificultad: ${parsed.difficulty}

Esquema de respuesta (JSON estricto):
{
  "questions": [
    {
      "question": "string",
      "options": ["string","string","string","string"],
      "correctIndex": 0,
      "explanation": "string — por qué la correcta y por qué las demás no",
      "sourceChunkIds": ["id-de-uno-o-más-extractos-usados"]
    }
  ]
}

Extractos (utiliza sus id en sourceChunkIds):
${context}`;

  const openai = new OpenAI({ apiKey });
  let rawJson = "";
  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    rawJson = completion.choices[0]?.message.content ?? "";
  } catch (err) {
    console.error("[api/ai/tests] openai failed:", err);
    return Response.json({ error: "LLM call failed" }, { status: 502 });
  }

  let validated: { questions: Question[] };
  try {
    const parsedJson: unknown = JSON.parse(rawJson);
    const out = questionsSchema.parse(parsedJson);
    // Trim to requested count and cast to the narrower tuple shape.
    validated = {
      questions: out.questions.slice(0, parsed.numQuestions).map((q) => ({
        question: q.question,
        options: [q.options[0], q.options[1], q.options[2], q.options[3]] as [
          string,
          string,
          string,
          string,
        ],
        correctIndex: q.correctIndex as 0 | 1 | 2 | 3,
        explanation: q.explanation,
        sourceChunkIds: q.sourceChunkIds,
      })),
    };
  } catch (err) {
    console.error("[api/ai/tests] json validation failed:", err, rawJson.slice(0, 400));
    return Response.json({ error: "LLM returned invalid JSON" }, { status: 502 });
  }

  return persistAndRespond(parsed, session.user.id, validated.questions, subj[0].name);
}

async function persistAndRespond(
  body: z.infer<typeof bodySchema>,
  userId: string,
  questions: Question[],
  subjectName: string,
): Promise<Response> {
  const sourceChunks = [
    ...new Set(questions.flatMap((q) => q.sourceChunkIds)),
  ];

  const [inserted] = await db
    .insert(generatedTests)
    .values({
      userId,
      subjectId: body.subjectId,
      topicId: body.topicId,
      title: `Test ${String(body.numQuestions)} preguntas · ${subjectName} (${body.difficulty})`,
      questions: questions.map((q) => ({
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
      })),
      sourceChunks,
    })
    .returning({ id: generatedTests.id });

  if (!inserted) {
    return Response.json({ error: "Failed to create test" }, { status: 500 });
  }

  return Response.json({ id: inserted.id, questions });
}
