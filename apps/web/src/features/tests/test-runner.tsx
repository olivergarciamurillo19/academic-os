"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { MockSubject } from "@/features/subjects/mock-data";
import { track } from "@/lib/analytics";

import { generateMockQuestions } from "./mock-generator";
import { TestConfigForm } from "./test-config";
import { TestQuestion } from "./test-question";
import { TestResults } from "./test-results";
import type { Answer, Question, TestConfig, TestResult } from "./types";

type Phase =
  | { kind: "config" }
  | { kind: "generating"; config: TestConfig }
  | {
      kind: "running";
      config: TestConfig;
      questions: readonly Question[];
      index: number;
      answers: Record<string, Answer>;
      startedAt: number;
    }
  | { kind: "results"; result: TestResult };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ApiQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

function apiToQuestions(rows: ApiQuestion[], subjectName: string): Question[] {
  return rows.map((row, i) => ({
    id: `q_${String(i + 1)}`,
    prompt: row.question,
    type: "multiple-choice" as const,
    options: row.options,
    correctIndex: row.correctIndex,
    explanation: row.explanation,
    sourceChunk: {
      resourceName: subjectName,
      excerpt: row.explanation.slice(0, 140),
    },
  }));
}

export function TestRunner({ subject }: { subject: MockSubject }) {
  const [phase, setPhase] = useState<Phase>({ kind: "config" });

  async function start(config: TestConfig) {
    track({
      name: "test_generated",
      payload: {
        subjectId: subject.id,
        count: config.count,
        difficulty: config.difficulty,
        type: config.type,
      },
    });
    // Only call the real API for uuid subjects + multiple-choice.
    if (UUID_RE.test(subject.id) && config.type === "multiple-choice") {
      setPhase({ kind: "generating", config });
      try {
        const res = await fetch("/api/ai/tests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subjectId: subject.id,
            numQuestions: config.count,
            difficulty: config.difficulty,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${String(res.status)}`);
        const data = (await res.json()) as { questions: ApiQuestion[] };
        const questions = apiToQuestions(data.questions, subject.name);
        setPhase({
          kind: "running",
          config,
          questions,
          index: 0,
          answers: {},
          startedAt: Date.now(),
        });
        return;
      } catch (err) {
        console.error("[tests] api failed, falling back to mock:", err);
        toast.error("No se pudo generar el test. Usando preguntas de ejemplo.");
      }
    }
    const questions = generateMockQuestions(subject, config);
    setPhase({
      kind: "running",
      config,
      questions,
      index: 0,
      answers: {},
      startedAt: Date.now(),
    });
  }

  function finishFrom(running: Extract<Phase, { kind: "running" }>) {
    const answers = Object.values(running.answers);
    const correctCount = answers.filter((a) => a.correct).length;
    const durationSeconds = Math.round((Date.now() - running.startedAt) / 1000);
    track({
      name: "test_completed",
      payload: {
        subjectId: subject.id,
        correct: correctCount,
        total: running.questions.length,
        seconds: durationSeconds,
      },
    });
    setPhase({
      kind: "results",
      result: {
        config: running.config,
        questions: running.questions,
        answers,
        correctCount,
        durationSeconds,
      },
    });
  }

  if (phase.kind === "config") {
    return <TestConfigForm onStart={(cfg) => void start(cfg)} />;
  }

  if (phase.kind === "generating") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-10 text-center">
        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-pulse bg-primary" />
        </div>
        <p className="text-sm font-medium">Generando preguntas…</p>
        <p className="text-xs text-muted-foreground">
          GPT-4o mini está preparando {String(phase.config.count)} preguntas de{" "}
          {phase.config.difficulty}.
        </p>
      </div>
    );
  }

  if (phase.kind === "running") {
    const q = phase.questions[phase.index];
    if (!q) return null;
    const answer = phase.answers[q.id] ?? null;
    return (
      <TestQuestion
        total={phase.questions.length}
        index={phase.index}
        question={q}
        answer={answer}
        startedAtEpoch={phase.startedAt}
        onAnswer={(a) =>
          setPhase({
            ...phase,
            answers: { ...phase.answers, [q.id]: a },
          })
        }
        onNext={() =>
          setPhase({ ...phase, index: Math.min(phase.index + 1, phase.questions.length - 1) })
        }
        onPrev={() => setPhase({ ...phase, index: Math.max(phase.index - 1, 0) })}
        onFinish={() => finishFrom(phase)}
      />
    );
  }

  return (
    <TestResults
      result={phase.result}
      onRetry={() => start(phase.result.config)}
      onRestart={() => setPhase({ kind: "config" })}
    />
  );
}
