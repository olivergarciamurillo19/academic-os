import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSubjectById } from "@/features/subjects/mock-data";

interface PageProps {
  params: Promise<{ subjectId: string }>;
}

export default async function SubjectChatTab({ params }: PageProps) {
  const { subjectId } = await params;
  const subject = getSubjectById(subjectId);
  if (!subject) notFound();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Chat IA</CardTitle>
        <CardDescription>Pregúntame sobre {subject.name}.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Pendiente: interfaz de chat con streaming y citations (Issue #31).
      </CardContent>
    </Card>
  );
}
