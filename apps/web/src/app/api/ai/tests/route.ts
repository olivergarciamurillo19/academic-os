import { db, generatedTests } from "@academic-os/db";
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

  // TODO(ai): once @academic-os/ai exposes a test-generator over the
  // retrieved chunks, call it here and pass the LLM-generated questions
  // into `generatedTests.values(...)`. For now we persist a deterministic
  // mock payload so the UI flow is fully wired end-to-end.
  const questions = Array.from({ length: parsed.numQuestions }).map((_, i) => ({
    question: `Pregunta ${i + 1} (${parsed.difficulty}) — pendiente de generación real.`,
    options: [
      "Opción A — correcta",
      "Opción B — distractor",
      "Opción C — distractor",
      "Opción D — distractor",
    ],
    correctIndex: 0,
    explanation: "Explicación provisional hasta que el RAG esté conectado.",
  }));

  const [inserted] = await db
    .insert(generatedTests)
    .values({
      userId: session.user.id,
      subjectId: parsed.subjectId,
      topicId: parsed.topicId,
      title: `Test ${parsed.numQuestions} preguntas (${parsed.difficulty})`,
      questions,
    })
    .returning({ id: generatedTests.id });

  if (!inserted) {
    return Response.json({ error: "Failed to create test" }, { status: 500 });
  }

  return Response.json({ id: inserted.id, questions });
}
