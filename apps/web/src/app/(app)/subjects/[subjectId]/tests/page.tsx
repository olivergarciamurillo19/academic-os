import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSubjectById } from "@/features/subjects/mock-data";

interface PageProps {
  params: Promise<{ subjectId: string }>;
}

export default async function SubjectTestsTab({ params }: PageProps) {
  const { subjectId } = await params;
  const subject = getSubjectById(subjectId);
  if (!subject) notFound();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tests de {subject.name}</CardTitle>
        <CardDescription>
          Genera tests sobre los temas que hayas subido.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Pendiente: generador de tests (Issue #36).
      </CardContent>
    </Card>
  );
}
