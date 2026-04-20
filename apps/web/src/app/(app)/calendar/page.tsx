import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calendario",
};

export default function CalendarPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Calendario</h1>
      <p className="text-sm text-muted-foreground">Placeholder — pendiente de Issue #20.</p>
    </div>
  );
}
