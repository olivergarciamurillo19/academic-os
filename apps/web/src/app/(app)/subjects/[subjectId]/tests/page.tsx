import { notFound } from "next/navigation";

import { getSubjectByIdForActiveUser } from "@/features/subjects/queries";
import { TestRunner } from "@/features/tests/test-runner";

interface PageProps {
  params: Promise<{ subjectId: string }>;
}

export default async function SubjectTestsTab({ params }: PageProps) {
  const { subjectId } = await params;
  const subject = await getSubjectByIdForActiveUser(subjectId);
  if (!subject) notFound();

  return <TestRunner subject={subject} />;
}
