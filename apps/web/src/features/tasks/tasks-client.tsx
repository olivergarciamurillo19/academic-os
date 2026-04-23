"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import { KanbanBoard } from "./kanban-board";
import { TaskListMobile } from "./task-list-mobile";

type GroupBy = "subject" | "date";

interface TasksClientProps {
  subjectId?: string | null;
}

export function TasksClient({ subjectId }: TasksClientProps) {
  const [groupBy, setGroupBy] = useState<GroupBy>("subject");
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-full border bg-background p-0.5 text-xs">
          <GroupToggle active={groupBy === "subject"} onClick={() => setGroupBy("subject")}>
            Por asignatura
          </GroupToggle>
          <GroupToggle active={groupBy === "date"} onClick={() => setGroupBy("date")}>
            Por fecha
          </GroupToggle>
        </div>
      </div>

      {isDesktop ? (
        <KanbanBoard subjectId={subjectId ?? null} />
      ) : (
        <TaskListMobile subjectId={subjectId ?? null} />
      )}

      {groupBy === "date" && (
        <p className="text-xs text-muted-foreground">
          Agrupación por fecha: se mostrará aquí cuando Armando exponga el endpoint de tareas reales.
        </p>
      )}
    </div>
  );
}

function GroupToggle({
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
        "inline-flex h-7 items-center rounded-full px-3 font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
