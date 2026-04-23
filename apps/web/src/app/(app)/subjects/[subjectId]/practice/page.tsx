import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResourceDropzone } from "@/features/materials/resource-dropzone";
import { ResourceList } from "@/features/materials/resource-list";
import { getSubjectByIdForActiveUser } from "@/features/subjects/queries";

interface PageProps {
  params: Promise<{ subjectId: string }>;
}

export default async function SubjectPracticeTab({ params }: PageProps) {
  const { subjectId } = await params;
  const subject = await getSubjectByIdForActiveUser(subjectId);
  if (!subject) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Material de práctica</CardTitle>
          <CardDescription>
            Enunciados, soluciones y tus propios intentos para {subject.name}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ResourceDropzone subjectId={subject.id} topicKind="practice" />
          <ResourceList subjectId={subject.id} topicKind="practice" />
        </CardContent>
      </Card>
    </div>
  );
}
