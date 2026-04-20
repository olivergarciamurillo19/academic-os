import { notFound } from "next/navigation";

import { getSubjectById } from "@/features/subjects/mock-data";
import { TestRunner } from "@/features/tests/test-runner";

interface PageProps {
  params: Promise<{ subjectId: string }>;
}

export default async function SubjectTestsTab({ params }: PageProps) {
  const { subjectId } = await params;
  const subject = getSubjectById(subjectId);
  if (!subject) notFound();

  return <TestRunner subject={subject} />;
}
