"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import {
  difficultyLabels,
  questionTypeLabels,
  type Difficulty,
  type QuestionCount,
  type QuestionType,
  type TestConfig,
} from "./types";

interface TestConfigFormProps {
  onStart: (config: TestConfig) => void;
}

const counts: readonly QuestionCount[] = [5, 10, 15, 20];
const difficulties: readonly Difficulty[] = ["easy", "medium", "hard"];
const types: readonly QuestionType[] = ["multiple-choice", "true-false", "short-answer"];

export function TestConfigForm({ onStart }: TestConfigFormProps) {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState<QuestionCount>(10);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [type, setType] = useState<QuestionType>("multiple-choice");

  return (
    <Card>
      <CardHeader className="gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </span>
        <CardTitle className="text-base">Configura tu test</CardTitle>
        <CardDescription>Generamos preguntas de ejemplo hasta que el LLM esté conectado.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onStart({ topic: topic.trim(), count, difficulty, type });
          }}
          className="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="topic">Tema o bloque</Label>
            <Input
              id="topic"
              placeholder="p.ej. Cinemática, Matrices, Derivadas…"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <Group label="Número de preguntas">
            {counts.map((c) => (
              <Chip key={c} active={count === c} onClick={() => setCount(c)}>
                {c}
              </Chip>
            ))}
          </Group>

          <Group label="Dificultad">
            {difficulties.map((d) => (
              <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
                {difficultyLabels[d]}
              </Chip>
            ))}
          </Group>

          <Group label="Tipo">
            {types.map((t) => (
              <Chip key={t} active={type === t} onClick={() => setType(t)}>
                {questionTypeLabels[t]}
              </Chip>
            ))}
          </Group>

          <div className="flex justify-end">
            <Button type="submit" size="lg">
              Generar test
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors",
        active
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-input text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
