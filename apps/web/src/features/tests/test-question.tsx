"use client";

import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { Answer, Question } from "./types";

interface TestQuestionProps {
  total: number;
  index: number;
  question: Question;
  answer: Answer | null;
  onAnswer: (answer: Answer) => void;
  onNext: () => void;
  onPrev: () => void;
  onFinish: () => void;
  startedAtEpoch: number;
}

export function TestQuestion({
  total,
  index,
  question,
  answer,
  onAnswer,
  onNext,
  onPrev,
  onFinish,
  startedAtEpoch,
}: TestQuestionProps) {
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - startedAtEpoch) / 1000));
  const ref = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const percent = Math.round(((index + 1) / total) * 100);
  const isLast = index === total - 1;

  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtEpoch) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [startedAtEpoch]);

  function recordAnswer(partial: Pick<Answer, "optionIndex" | "text">) {
    const correct = gradeAnswer(question, partial);
    onAnswer({ questionId: question.id, ...partial, correct });
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 60) return;
    if (dx < 0 && !isLast) onNext();
    if (dx > 0 && index > 0) onPrev();
  }

  return (
    <div ref={ref} className="flex flex-col gap-4" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>
          Pregunta {index + 1} de {total}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          <time>{formatElapsed(elapsed)}</time>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base leading-relaxed">{question.prompt}</CardTitle>
        </CardHeader>
        <CardContent>
          {question.type === "multiple-choice" || question.type === "true-false" ? (
            <ul className="flex flex-col gap-2">
              {(question.options ?? []).map((opt, i) => {
                const picked = answer?.optionIndex === i;
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => recordAnswer({ optionIndex: i })}
                      className={cn(
                        "w-full rounded-md border p-3 text-left text-sm transition-colors",
                        picked
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-input hover:bg-accent",
                      )}
                    >
                      <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                        {String.fromCharCode(65 + i)}
                      </span>
                      {opt}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Input
              placeholder="Tu respuesta…"
              value={answer?.text ?? ""}
              onChange={(e) => recordAnswer({ text: e.target.value })}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onPrev} disabled={index === 0}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Anterior
        </Button>
        {isLast ? (
          <Button onClick={onFinish} disabled={answer === null}>
            Terminar
          </Button>
        ) : (
          <Button onClick={onNext}>
            Siguiente
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function gradeAnswer(
  question: Question,
  partial: Pick<Answer, "optionIndex" | "text">,
): boolean {
  if (question.type === "short-answer") {
    if (!partial.text || !question.correctText) return false;
    return normalize(partial.text).includes(normalize(question.correctText).slice(0, 12));
  }
  if (partial.optionIndex === undefined || question.correctIndex === undefined) return false;
  return partial.optionIndex === question.correctIndex;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
