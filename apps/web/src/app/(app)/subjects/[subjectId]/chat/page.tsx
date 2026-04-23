import { notFound } from "next/navigation";

import { SubjectChat } from "@/features/chat/subject-chat";
import { getSubjectByIdForActiveUser } from "@/features/subjects/queries";

interface PageProps {
  params: Promise<{ subjectId: string }>;
}

export default async function SubjectChatTab({ params }: PageProps) {
  const { subjectId } = await params;
  const subject = await getSubjectByIdForActiveUser(subjectId);
  if (!subject) notFound();

  return <SubjectChat subject={subject} />;
}
