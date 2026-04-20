import { subjectColorVar, type MockSubject } from "./mock-data";

interface SubjectHeaderProps {
  subject: MockSubject;
}

export function SubjectHeader({ subject }: SubjectHeaderProps) {
  return (
    <header className="overflow-hidden rounded-xl border bg-card">
      <div
        aria-hidden="true"
        className="h-3 w-full"
        style={{ backgroundColor: subjectColorVar(subject.colorIndex) }}
      />
      <div className="flex flex-col gap-2 p-5 md:p-6">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span>{subject.code}</span>
          <span aria-hidden="true">·</span>
          <span>{subject.semester === "1Q" ? "1er cuatrimestre" : "2º cuatrimestre"}</span>
          <span aria-hidden="true">·</span>
          <span>{subject.credits} ECTS</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{subject.name}</h1>
      </div>
    </header>
  );
}
