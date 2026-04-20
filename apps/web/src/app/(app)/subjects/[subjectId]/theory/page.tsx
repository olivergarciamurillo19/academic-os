import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSubjectById } from "@/features/subjects/mock-data";

interface PageProps {
  params: Promise<{ subjectId: string }>;
}

export default async function SubjectTheoryTab({ params }: PageProps) {
  const { subjectId } = await params;
  const subject = getSubjectById(subjectId);
  if (!subject) notFound();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Material de teoría</CardTitle>
        <CardDescription>
          Apuntes y guiones del profesor para {subject.name}. El upload y viewer llegan en la siguiente tarea.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Pendiente: ResourceDropzone + listado (Issue #17).
      </CardContent>
    </Card>
  );
}
