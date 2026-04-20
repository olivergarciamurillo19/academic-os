import { CalendarClock } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

import { formatSubjectEvent } from "./format";
import { subjectColorVar, type MockSubject } from "./mock-data";

interface SubjectCardProps {
  subject: MockSubject;
}

export function SubjectCard({ subject }: SubjectCardProps) {
  const next = subject.nextEvent ? formatSubjectEvent(subject.nextEvent.whenISO) : null;
  const color = subjectColorVar(subject.colorIndex);

  return (
    <Link
      href={{ pathname: `/subjects/${subject.id}` }}
      className="group block focus-visible:outline-none"
      aria-label={`Abrir asignatura ${subject.name}`}
    >
      <Card className="h-full overflow-hidden py-0 transition-all group-hover:border-primary/60 group-hover:shadow-md group-focus-visible:border-primary group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <div aria-hidden="true" className="h-2 w-full" style={{ backgroundColor: color }} />
        <CardHeader className="gap-2 pt-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base font-semibold leading-tight tracking-tight">
                {subject.name}
              </h2>
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {subject.code}
              </span>
            </div>
            <span className="whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {subject.credits} ECTS
            </span>
          </div>
        </CardHeader>
        <CardContent className="pb-5">
          {next ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                <time dateTime={next.dateTime}>{next.label}</time>
                {" · "}
                {subject.nextEvent?.label}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Sin eventos próximos</span>
          )}
        </CardContent>
        <CardFooter className="border-t pb-4 pt-3 text-xs text-muted-foreground">
          {subject.semester === "1Q" ? "1er cuatrimestre" : "2º cuatrimestre"}
        </CardFooter>
      </Card>
    </Link>
  );
}
