import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSubjectById } from "@/features/subjects/mock-data";

interface PageProps {
  params: Promise<{ subjectId: string }>;
}

export default async function SubjectPracticeTab({ params }: PageProps) {
  const { subjectId } = await params;
  const subject = getSubjectById(subjectId);
  if (!subject) notFound();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Material de práctica</CardTitle>
        <CardDescription>
          Enunciados, soluciones y tus propios intentos para {subject.name}.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Pendiente: ResourceDropzone + listado (Issue #17).
      </CardContent>
    </Card>
  );
}
