"use client";

import { CheckCircle2, ChevronDown, ChevronUp, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { questionTypeLabels, type Answer, type Question, type TestResult } from "./types";

interface TestResultsProps {
  result: TestResult;
  onRetry: () => void;
  onRestart: () => void;
}

export function TestResults({ result, onRetry, onRestart }: TestResultsProps) {
  const percent = Math.round((result.correctCount / result.questions.length) * 100);
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="gap-1">
          <CardDescription className="uppercase tracking-wide">Resultado</CardDescription>
          <CardTitle className="text-3xl">
            {result.correctCount}/{result.questions.length}
          </CardTitle>
          <CardDescription>
            {percent}% · {questionTypeLabels[result.config.type]} ·{" "}
            {Math.round(result.durationSeconds / 60)} min
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={onRetry}>Repetir test</Button>
          <Button variant="outline" onClick={onRestart}>
            Nuevo test
          </Button>
        </CardContent>
      </Card>

      <ol className="flex flex-col gap-3">
        {result.questions.map((q, i) => {
          const a = result.answers.find((x) => x.questionId === q.id) ?? null;
          return (
            <li key={q.id}>
              <QuestionRow index={i + 1} question={q} answer={a} />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function QuestionRow({
  index,
  question,
  answer,
}: {
  index: number;
  question: Question;
  answer: Answer | null;
}) {
  const [open, setOpen] = useState(false);
  const correct = answer?.correct === true;
  return (
    <Card className={cn(correct ? "border-primary/30" : "border-destructive/30")}>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
              correct ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive",
            )}
          >
            {correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          </span>
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Pregunta {index}
            </span>
            <p className="text-sm font-medium leading-relaxed">{question.prompt}</p>
          </div>
        </div>

        <dl className="grid gap-2 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Tu respuesta</dt>
            <dd className={cn("font-medium", correct ? "" : "text-destructive")}>
              {answer ? answerLabel(question, answer) : "— sin responder"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Correcta</dt>
            <dd className="font-medium">{correctLabel(question)}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 self-start text-xs font-medium text-primary hover:underline"
        >
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {open ? "Ocultar explicación" : "Ver explicación"}
        </button>

        {open && (
          <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3 text-xs">
            <p className="leading-relaxed">{question.explanation}</p>
            <div className="flex flex-col gap-1 border-t pt-2">
              <span className="font-medium">
                Fuente: {question.sourceChunk.resourceName}
                {question.sourceChunk.page && ` · p. ${question.sourceChunk.page}`}
              </span>
              <blockquote className="border-l-2 pl-2 italic text-muted-foreground">
                {question.sourceChunk.excerpt}
              </blockquote>
              {question.sourceChunk.resourceHref && (
                <Link
                  href={{ pathname: question.sourceChunk.resourceHref }}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Abrir recurso →
                </Link>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function answerLabel(question: Question, answer: Answer): string {
  if (question.type === "short-answer") return answer.text ?? "—";
  const opts = question.options ?? [];
  const idx = answer.optionIndex;
  if (idx === undefined) return "—";
  return opts[idx] ?? `Opción ${idx + 1}`;
}

function correctLabel(question: Question): string {
  if (question.type === "short-answer") return question.correctText ?? "—";
  const opts = question.options ?? [];
  if (question.correctIndex === undefined) return "—";
  return opts[question.correctIndex] ?? `Opción ${question.correctIndex + 1}`;
}
