"use client";

import {
  DndContext,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useMemo } from "react";

import { QuickAdd } from "./quick-add";
import { TaskCard } from "./task-card";
import { useTaskActions, useTasks } from "./task-store";
import { STATUS_ORDER, statusLabels, type Task, type TaskStatus } from "./types";

interface KanbanBoardProps {
  subjectId?: string | null;
}

export function KanbanBoard({ subjectId }: KanbanBoardProps) {
  const allTasks = useTasks();
  const tasks = subjectId ? allTasks.filter((t) => t.subjectId === subjectId) : allTasks;
  const { setStatus } = useTaskActions();

  const grouped = useMemo(() => {
    return STATUS_ORDER.reduce<Record<TaskStatus, Task[]>>(
      (acc, s) => {
        acc[s] = tasks.filter((t) => t.status === s);
        return acc;
      },
      { todo: [], doing: [], done: [] },
    );
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const newStatus = over.id as TaskStatus;
    if (!STATUS_ORDER.includes(newStatus)) return;
    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== newStatus) {
      void setStatus(taskId, newStatus);
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      <div className="grid gap-4 md:grid-cols-3">
        {STATUS_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={grouped[status]}
            subjectId={subjectId ?? null}
          />
        ))}
      </div>
    </DndContext>
  );
}

function KanbanColumn({
  status,
  tasks,
  subjectId,
}: {
  status: TaskStatus;
  tasks: Task[];
  subjectId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      className={`flex flex-col gap-3 rounded-xl border bg-muted/30 p-3 transition-colors ${
        isOver ? "border-primary/60 bg-primary/5" : ""
      }`}
      aria-label={statusLabels[status]}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{statusLabels[status]}</h2>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
          {tasks.length}
        </span>
      </div>
      <QuickAdd status={status} defaultSubjectId={subjectId} />
      <ul className="flex flex-col gap-2">
        {tasks.map((task) => (
          <li key={task.id}>
            <DraggableTask task={task} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function DraggableTask({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });
  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 20 : undefined }
    : undefined;
  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        task={task}
        dragAttributes={attributes as unknown as Record<string, unknown>}
        dragListeners={listeners as unknown as Record<string, unknown>}
        isDragging={isDragging}
      />
    </div>
  );
}
