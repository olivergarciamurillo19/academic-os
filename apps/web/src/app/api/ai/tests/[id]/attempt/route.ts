import {
  db,
  generatedTests,
  testAttempts,
  users,
} from "@academic-os/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  answers: z.array(z.number().int().min(0).max(3)),
});

interface Feedback {
  questionIndex: number;
  correct: boolean;
  explanation: string;
}

interface WeakTopicRecord {
  topicId: string | null;
  subjectId: string;
  incorrectCount: number;
  lastSeenISO: string;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) {
    return Response.json({ error: "Invalid test id" }, { status: 400 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch (err) {
    return Response.json(
      { error: "Invalid body", detail: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }

  const test = await db.query.generatedTests.findFirst({
    where: eq(generatedTests.id, id),
  });
  if (test?.userId !== session.user.id) {
    return Response.json({ error: "Test not found" }, { status: 404 });
  }

  const questions = test.questions;
  if (parsed.answers.length !== questions.length) {
    return Response.json(
      { error: `Expected ${String(questions.length)} answers, got ${String(parsed.answers.length)}` },
      { status: 400 },
    );
  }

  // ── Score ─────────────────────────────────────────────────────────────────
  const feedback: Feedback[] = questions.map((q, i) => {
    const userAnswer = parsed.answers[i] ?? -1;
    const correct = userAnswer === q.correctIndex;
    return {
      questionIndex: i,
      correct,
      explanation: q.explanation ?? "",
    };
  });

  const correctCount = feedback.filter((f) => f.correct).length;
  const total = questions.length;
  const scoreText = `${String(correctCount)}/${String(total)}`;

  const [attempt] = await db
    .insert(testAttempts)
    .values({
      generatedTestId: test.id,
      userId: session.user.id,
      answers: parsed.answers,
      score: scoreText,
      feedback,
      completedAt: new Date(),
    })
    .returning({ id: testAttempts.id });

  // ── Update users.preferences.weakTopics ──────────────────────────────────
  if (correctCount < total) {
    const userRow = await db
      .select({ id: users.id, preferences: users.preferences })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    const existing = userRow[0]?.preferences ?? {};
    const weakTopics = Array.isArray(existing.weakTopics)
      ? (existing.weakTopics as WeakTopicRecord[])
      : [];

    const key = test.topicId ?? `subject:${test.subjectId}`;
    const incorrect = total - correctCount;
    const idx = weakTopics.findIndex(
      (w) => (w.topicId ?? `subject:${w.subjectId}`) === key,
    );
    if (idx >= 0) {
      const current = weakTopics[idx];
      if (current) {
        weakTopics[idx] = {
          ...current,
          incorrectCount: current.incorrectCount + incorrect,
          lastSeenISO: new Date().toISOString(),
        };
      }
    } else {
      weakTopics.push({
        topicId: test.topicId,
        subjectId: test.subjectId,
        incorrectCount: incorrect,
        lastSeenISO: new Date().toISOString(),
      });
    }

    await db
      .update(users)
      .set({ preferences: { ...existing, weakTopics } })
      .where(eq(users.id, session.user.id));
  }

  return Response.json({
    attemptId: attempt?.id ?? null,
    score: scoreText,
    correctCount,
    total,
    feedback,
  });
}
