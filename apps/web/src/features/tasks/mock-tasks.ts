import { addDays } from "date-fns";

import { mockSubjects } from "@/features/subjects/mock-data";

import type { Task } from "./types";

function daysOut(n: number): string {
  return addDays(new Date(), n).toISOString();
}

function pick<T>(arr: readonly T[], i: number): T {
  const v = arr[i % arr.length];
  if (v === undefined) throw new Error("empty array");
  return v;
}

const seedTitles: readonly string[] = [
  "Repasar tema 3 de teoría",
  "Terminar hoja de problemas",
  "Leer capítulo 4 del libro",
  "Preparar resumen para el examen",
  "Hacer práctica de laboratorio",
  "Entregar trabajo grupal",
  "Subir apuntes escaneados",
  "Ver vídeo del profesor",
  "Repasar fórmulas clave",
  "Hacer test de 10 preguntas",
];

export const mockInitialTasks: readonly Task[] = seedTitles.map((title, i) => {
  const statuses = ["todo", "doing", "done"] as const;
  const priorities = ["low", "normal", "high"] as const;
  return {
    id: `task-${i}`,
    title,
    subjectId: pick(mockSubjects, i).id,
    status: pick(statuses, i),
    priority: pick(priorities, i),
    dueISO: daysOut(i - 2),
    createdAtISO: new Date().toISOString(),
  };
});
