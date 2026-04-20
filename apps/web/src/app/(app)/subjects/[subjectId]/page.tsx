import { CalendarClock, FileText, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSubjectEvent } from "@/features/subjects/format";
import { getSubjectById } from "@/features/subjects/mock-data";

interface PageProps {
  params: Promise<{ subjectId: string }>;
}

export default async function SubjectOverview({ params }: PageProps) {
  const { subjectId } = await params;
  const subject = getSubjectById(subjectId);
  if (!subject) notFound();

  const next = subject.nextEvent ? formatSubjectEvent(subject.nextEvent.whenISO) : null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <CalendarClock className="h-4 w-4" />
          </span>
          <CardTitle className="text-base">Próximo evento</CardTitle>
          <CardDescription>
            {next ? (
              <span>
                <time dateTime={next.dateTime}>{next.label}</time>
                {" · "}
                {subject.nextEvent?.label}
              </span>
            ) : (
              "Sin eventos próximos"
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </span>
          <CardTitle className="text-base">Material</CardTitle>
          <CardDescription>
            Sube PDFs de teoría y práctica. El chat IA los usará como fuente.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <CardTitle className="text-base">Tu progreso</CardTitle>
          <CardDescription>
            Aparecerá aquí cuando hayas hecho tests o interactuado con el chat.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Pendiente de datos reales del backend.
        </CardContent>
      </Card>
    </div>
  );
}
