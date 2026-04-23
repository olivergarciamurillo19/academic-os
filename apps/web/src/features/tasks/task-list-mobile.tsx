"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { QuickAdd } from "./quick-add";
import { TaskCard } from "./task-card";
import { useTaskActions, useTasks } from "./task-store";
import { STATUS_ORDER, statusLabels, type Task, type TaskStatus } from "./types";

interface TaskListMobileProps {
  subjectId?: string | null;
}

function nextStatus(current: TaskStatus, dir: 1 | -1): TaskStatus | null {
  const idx = STATUS_ORDER.indexOf(current);
  const nextIdx = idx + dir;
  return STATUS_ORDER[nextIdx] ?? null;
}

export function TaskListMobile({ subjectId }: TaskListMobileProps) {
  const allTasks = useTasks();
  const { setStatus } = useTaskActions();
  const tasks = subjectId ? allTasks.filter((t) => t.subjectId === subjectId) : allTasks;
  const [selected, setSelected] = useState<TaskStatus>("todo");
  const filtered = tasks.filter((t) => t.status === selected);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 rounded-full bg-muted p-1 text-sm">
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSelected(s)}
            aria-pressed={selected === s}
            className={`flex-1 rounded-full px-3 py-1 font-medium transition-colors ${
              selected === s
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            {statusLabels[s]}
          </button>
        ))}
      </div>

      <QuickAdd status={selected} defaultSubjectId={subjectId ?? null} />

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Sin tareas en {statusLabels[selected].toLowerCase()}.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((task) => (
            <SwipeableTask
              key={task.id}
              task={task}
              onSwipe={(dir) => {
                const next = nextStatus(task.status, dir);
                if (next) {
                  void setStatus(task.id, next);
                  toast.success(`Movida a ${statusLabels[next]}`);
                }
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function SwipeableTask({
  task,
  onSwipe,
}: {
  task: Task;
  onSwipe: (dir: 1 | -1) => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const startX = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);

  function onPointerDown(e: React.PointerEvent<HTMLLIElement>) {
    startX.current = e.clientX;
    ref.current?.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLLIElement>) {
    if (startX.current === null) return;
    setOffset(e.clientX - startX.current);
  }
  function onPointerUp() {
    if (Math.abs(offset) > 80) {
      onSwipe(offset > 0 ? 1 : -1);
    }
    setOffset(0);
    startX.current = null;
  }

  const leftLabel = statusLabels[STATUS_ORDER[Math.max(0, STATUS_ORDER.indexOf(task.status) - 1)] ?? task.status];
  const rightLabel = statusLabels[STATUS_ORDER[Math.min(STATUS_ORDER.length - 1, STATUS_ORDER.indexOf(task.status) + 1)] ?? task.status];

  return (
    <li
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="relative touch-pan-y select-none"
      style={{ transform: `translateX(${offset}px)`, transition: offset === 0 ? "transform 180ms" : undefined }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-between px-3 text-xs font-medium"
        style={{ opacity: Math.min(1, Math.abs(offset) / 80) }}
      >
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <ChevronLeft className="h-3 w-3" /> {leftLabel}
        </span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          {rightLabel} <ChevronRight className="h-3 w-3" />
        </span>
      </div>
      <TaskCard task={task} />
    </li>
  );
}
