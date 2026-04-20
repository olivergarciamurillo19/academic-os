"use client";

import { format, isPast, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarClock, Flag } from "lucide-react";
import type { CSSProperties } from "react";

import { useSubjectById } from "@/features/subjects/use-subjects";
import { cn } from "@/lib/utils";

import { priorityAccent, priorityLabels, type Task } from "./types";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  dragListeners?: Record<string, unknown>;
  dragAttributes?: Record<string, unknown>;
  style?: CSSProperties;
  isDragging?: boolean;
}

export function TaskCard({
  task,
  onClick,
  dragListeners,
  dragAttributes,
  style,
  isDragging,
}: TaskCardProps) {
  const subject = useSubjectById(task.subjectId);
  const subjectColor = subject?.color ?? null;
  const due = task.dueISO ? new Date(task.dueISO) : null;
  const dueLabel = due ? formatDue(due) : null;
  const dueState = due ? (isPast(due) && !isToday(due) ? "overdue" : isToday(due) ? "today" : "ok") : "none";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      style={style}
      {...dragAttributes}
      {...dragListeners}
      className={cn(
        "group flex flex-col gap-2 rounded-lg border bg-card p-3 text-left shadow-sm transition-colors hover:border-primary/50",
        isDragging && "opacity-70 shadow-lg",
      )}
    >
      <div className="flex items-start gap-2">
        {subjectColor && (
          <span
            aria-hidden="true"
            className="mt-1 h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: subjectColor }}
          />
        )}
        <span className="flex-1 text-sm font-medium leading-snug">{task.title}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {subject && <span className="truncate">{subject.shortName}</span>}
        {dueLabel && (
          <span
            className={cn(
              "inline-flex items-center gap-1",
              dueState === "overdue" && "text-destructive",
              dueState === "today" && "text-primary",
            )}
          >
            <CalendarClock className="h-3 w-3" />
            <time dateTime={due?.toISOString()}>{dueLabel}</time>
          </span>
        )}
        <span
          className="inline-flex items-center gap-1"
          style={{ color: priorityAccent[task.priority] }}
          aria-label={`Prioridad ${priorityLabels[task.priority]}`}
        >
          <Flag className="h-3 w-3" />
          {priorityLabels[task.priority]}
        </span>
      </div>
    </div>
  );
}

function formatDue(d: Date): string {
  if (isToday(d)) return "Hoy";
  return format(d, "d MMM", { locale: es });
}
