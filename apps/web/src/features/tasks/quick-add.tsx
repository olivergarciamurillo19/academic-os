"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";

import { useTaskActions } from "./task-store";
import type { TaskStatus } from "./types";

interface QuickAddProps {
  status: TaskStatus;
  defaultSubjectId?: string | null;
}

export function QuickAdd({ status, defaultSubjectId }: QuickAddProps) {
  const { create } = useTaskActions();
  const [value, setValue] = useState("");

  function submit() {
    const title = value.trim();
    if (title.length === 0) return;
    void create({
      title,
      subjectId: defaultSubjectId ?? null,
      status,
      priority: "normal",
    });
    setValue("");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="relative"
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Añadir tarea…"
        aria-label={`Añadir tarea a ${status}`}
        className="pr-8 text-sm"
      />
      <button
        type="submit"
        aria-label="Añadir"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-4 w-4" />
      </button>
    </form>
  );
}
