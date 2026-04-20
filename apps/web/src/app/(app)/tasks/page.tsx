import type { Metadata } from "next";

import { TasksClient } from "@/features/tasks/tasks-client";

export const metadata: Metadata = {
  title: "Tareas",
};

export default function TasksPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 p-4 md:p-6 lg:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Tareas</h1>
        <p className="text-sm text-muted-foreground">
          Lo que tienes que hacer. Arrastra para cambiar de estado en escritorio; desliza en móvil.
        </p>
      </header>
      <TasksClient />
    </div>
  );
}
