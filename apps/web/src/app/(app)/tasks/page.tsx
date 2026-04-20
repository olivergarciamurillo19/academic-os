import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tareas",
};

export default function TasksPage() {
  return (
    <div className="mx-auto flex max-w-screen-xl flex-col gap-4 p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Tareas</h1>
      <p className="text-sm text-muted-foreground">Placeholder — pendiente de Issue #23.</p>
    </div>
  );
}
