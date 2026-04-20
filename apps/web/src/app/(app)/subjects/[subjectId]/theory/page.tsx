import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResourceDropzone } from "@/features/materials/resource-dropzone";
import { ResourceList } from "@/features/materials/resource-list";
import { getSubjectById } from "@/features/subjects/mock-data";

interface PageProps {
  params: Promise<{ subjectId: string }>;
}

export default async function SubjectTheoryTab({ params }: PageProps) {
  const { subjectId } = await params;
  const subject = getSubjectById(subjectId);
  if (!subject) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Material de teoría</CardTitle>
          <CardDescription>
            Apuntes y guiones para {subject.name}. Se indexarán para el chat IA cuando Armando
            conecte la ingestion.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ResourceDropzone subjectId={subject.id} topicKind="theory" />
          <ResourceList subjectId={subject.id} topicKind="theory" />
        </CardContent>
      </Card>
    </div>
  );
}
