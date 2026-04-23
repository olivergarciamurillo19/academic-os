import { notFound } from "next/navigation";

import { CalendarPageClient } from "@/features/calendar/calendar-page-client";
import { getSubjectByIdForActiveUser } from "@/features/subjects/queries";

interface PageProps {
  params: Promise<{ subjectId: string }>;
}

export default async function SubjectCalendarTab({ params }: PageProps) {
  const { subjectId } = await params;
  const subject = await getSubjectByIdForActiveUser(subjectId);
  if (!subject) notFound();

  return <CalendarPageClient subjectId={subject.id} />;
}
