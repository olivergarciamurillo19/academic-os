export type TaskStatus = "todo" | "doing" | "done";
export type TaskPriority = "low" | "normal" | "high";

export interface Task {
  id: string;
  title: string;
  subjectId: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueISO?: string;
  createdAtISO: string;
}

export const statusLabels: Record<TaskStatus, string> = {
  todo: "Por hacer",
  doing: "En curso",
  done: "Hechas",
};

export const priorityLabels: Record<TaskPriority, string> = {
  low: "Baja",
  normal: "Normal",
  high: "Alta",
};

export const priorityAccent: Record<TaskPriority, string> = {
  low: "oklch(0.72 0.08 210)",
  normal: "oklch(0.60 0.0 0)",
  high: "oklch(0.62 0.22 25)",
};

export const STATUS_ORDER: readonly TaskStatus[] = ["todo", "doing", "done"];
