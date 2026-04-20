import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSubjectEvent } from "@/features/subjects/format";
import { getSubjectById } from "@/features/subjects/mock-data";

interface PageProps {
  params: Promise<{ subjectId: string }>;
}

export default async function SubjectCalendarTab({ params }: PageProps) {
  const { subjectId } = await params;
  const subject = getSubjectById(subjectId);
  if (!subject) notFound();

  const next = subject.nextEvent ? formatSubjectEvent(subject.nextEvent.whenISO) : null;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calendario de {subject.name}</CardTitle>
          <CardDescription>
            Filtrado de /calendar por esta asignatura — vista completa en la ruta global.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {next ? (
            <span>
              Próximo: <time dateTime={next.dateTime}>{next.label}</time>
              {" · "}
              {subject.nextEvent?.label}
            </span>
          ) : (
            "Sin eventos de esta asignatura todavía."
          )}
        </CardContent>
      </Card>
    </div>
  );
}
