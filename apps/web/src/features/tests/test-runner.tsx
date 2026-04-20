"use client";

import { useState } from "react";

import type { MockSubject } from "@/features/subjects/mock-data";
import { track } from "@/lib/analytics";

import { generateMockQuestions } from "./mock-generator";
import { TestConfigForm } from "./test-config";
import { TestQuestion } from "./test-question";
import { TestResults } from "./test-results";
import type { Answer, Question, TestConfig, TestResult } from "./types";

type Phase =
  | { kind: "config" }
  | {
      kind: "running";
      config: TestConfig;
      questions: readonly Question[];
      index: number;
      answers: Record<string, Answer>;
      startedAt: number;
    }
  | { kind: "results"; result: TestResult };

export function TestRunner({ subject }: { subject: MockSubject }) {
  const [phase, setPhase] = useState<Phase>({ kind: "config" });

  function start(config: TestConfig) {
    const questions = generateMockQuestions(subject, config);
    track({
      name: "test_generated",
      payload: {
        subjectId: subject.id,
        count: config.count,
        difficulty: config.difficulty,
        type: config.type,
      },
    });
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
    return <TestConfigForm onStart={start} />;
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
