import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ResourceViewer } from "@/features/materials/resource-viewer";
import { getSubjectById } from "@/features/subjects/mock-data";

interface PageProps {
  params: Promise<{ subjectId: string; resourceId: string }>;
}

export default async function ResourceViewerPage({ params }: PageProps) {
  const { subjectId, resourceId } = await params;
  const subject = getSubjectById(subjectId);
  if (!subject) notFound();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 md:p-6 lg:p-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={{ pathname: "/subjects" }}>Asignaturas</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={{ pathname: `/subjects/${subject.id}` }}>{subject.name}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Recurso</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <ResourceViewer resourceId={resourceId} />
    </div>
  );
}
