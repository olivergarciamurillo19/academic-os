import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getSubjectByIdForActiveUser } from "@/features/subjects/queries";
import { SubjectHeader } from "@/features/subjects/subject-header";
import { SubjectTabs, type SubjectTab } from "@/features/subjects/subject-tabs";

interface LayoutProps {
  params: Promise<{ subjectId: string }>;
  children: ReactNode;
}

export default async function SubjectDetailLayout({ params, children }: LayoutProps) {
  const { subjectId } = await params;
  const subject = await getSubjectByIdForActiveUser(subjectId);
  if (!subject) notFound();

  const base = `/subjects/${subject.id}` as const;
  const tabs: readonly SubjectTab[] = [
    { key: "overview", label: "Resumen", href: base, exact: true },
    { key: "theory", label: "Teoría", href: `${base}/theory` },
    { key: "practice", label: "Práctica", href: `${base}/practice` },
    { key: "chat", label: "Chat IA", href: `${base}/chat` },
    { key: "tests", label: "Tests", href: `${base}/tests` },
    { key: "calendar", label: "Calendario", href: `${base}/calendar` },
  ];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 md:p-6 lg:p-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={{ pathname: "/dashboard" }}>Inicio</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={{ pathname: "/subjects" }}>Asignaturas</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{subject.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <SubjectHeader subject={subject} />

      <SubjectTabs tabs={tabs} />

      <section>{children}</section>
    </div>
  );
}
