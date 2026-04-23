import type { Metadata } from "next";

import { CalendarPageClient } from "@/features/calendar/calendar-page-client";

export const metadata: Metadata = {
  title: "Calendario",
};

export default function CalendarPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 p-4 md:p-6 lg:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Calendario</h1>
        <p className="text-sm text-muted-foreground">
          Clases, exámenes y entregas. Los eventos se guardan en tu navegador mientras Armando
          termina el backend.
        </p>
      </header>
      <CalendarPageClient />
    </div>
  );
}
