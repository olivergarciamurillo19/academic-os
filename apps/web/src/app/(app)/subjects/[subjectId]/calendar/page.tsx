import { notFound } from "next/navigation";

import { CalendarPageClient } from "@/features/calendar/calendar-page-client";
import { getSubjectById } from "@/features/subjects/mock-data";

interface PageProps {
  params: Promise<{ subjectId: string }>;
}

export default async function SubjectCalendarTab({ params }: PageProps) {
  const { subjectId } = await params;
  const subject = getSubjectById(subjectId);
  if (!subject) notFound();

  return <CalendarPageClient subjectId={subject.id} />;
}
