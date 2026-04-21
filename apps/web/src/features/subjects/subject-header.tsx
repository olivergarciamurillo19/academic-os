import { SubjectColorPicker } from "./color-picker";
import { subjectColorVar, type MockSubject } from "./mock-data";

interface SubjectHeaderProps {
  subject: MockSubject;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_RE = /^#[0-9a-f]{6}$/i;

export function SubjectHeader({ subject }: SubjectHeaderProps) {
  const stripeColor =
    typeof subject.color === "string" && HEX_RE.test(subject.color)
      ? subject.color
      : subjectColorVar(subject.colorIndex);
  const canEditColor = UUID_RE.test(subject.id);
  return (
    <header className="overflow-hidden rounded-xl border bg-card">
      <div
        aria-hidden="true"
        className="h-3 w-full"
        style={{ backgroundColor: stripeColor }}
      />
      <div className="flex flex-col gap-3 p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span>{subject.code}</span>
              <span aria-hidden="true">·</span>
              <span>{subject.semester === "1Q" ? "1er cuatrimestre" : "2º cuatrimestre"}</span>
              <span aria-hidden="true">·</span>
              <span>{subject.credits} ECTS</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{subject.name}</h1>
          </div>
          {canEditColor ? (
            <SubjectColorPicker subjectId={subject.id} current={stripeColor} />
          ) : null}
        </div>
      </div>
    </header>
  );
}
