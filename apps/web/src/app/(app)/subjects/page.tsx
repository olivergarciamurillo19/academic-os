import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Asignaturas",
};

export default function SubjectsPage() {
  return (
    <div className="mx-auto flex max-w-screen-xl flex-col gap-4 p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Asignaturas</h1>
      <p className="text-sm text-muted-foreground">
        Placeholder — se rellena en la siguiente tarea.
      </p>
    </div>
  );
}
