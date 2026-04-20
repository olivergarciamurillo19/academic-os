import "server-only";

import { db, documents, resources } from "@academic-os/db";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { count, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Admin · Jobs" };

const STATUSES = ["pending", "processing", "indexed", "failed"] as const;

export default async function AdminJobsPage() {
  const [byStatus, recent] = await Promise.all([
    db
      .select({ status: documents.status, c: count() })
      .from(documents)
      .groupBy(documents.status),
    db
      .select({
        id: documents.id,
        status: documents.status,
        updatedAt: documents.updatedAt,
        indexedAt: documents.indexedAt,
        processingError: documents.processingError,
        title: resources.title,
        ownerUserId: resources.ownerUserId,
      })
      .from(documents)
      .innerJoin(resources, eq(resources.id, documents.resourceId))
      .orderBy(desc(documents.updatedAt))
      .limit(50),
  ]);

  const counts: Record<string, number> = {};
  for (const r of byStatus) counts[r.status] = r.c;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-6 lg:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
        <p className="text-sm text-muted-foreground">
          Estado de la cola de indexación de documentos.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        {STATUSES.map((s) => (
          <Card key={s}>
            <CardHeader>
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                {s}
              </CardTitle>
              <p className="text-2xl font-semibold">{counts[s] ?? 0}</p>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos documentos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Título</th>
                  <th className="px-4 py-2 text-left font-medium">Estado</th>
                  <th className="px-4 py-2 text-left font-medium">Actualizado</th>
                  <th className="px-4 py-2 text-left font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((d) => (
                  <tr key={d.id} className="border-t">
                    <td className="px-4 py-2">{d.title}</td>
                    <td className="px-4 py-2">
                      <Badge variant={d.status === "failed" ? "destructive" : d.status === "indexed" ? "default" : "secondary"}>
                        {d.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {format(d.updatedAt, "d MMM HH:mm", { locale: es })}
                    </td>
                    <td className="px-4 py-2 font-mono text-[10px] text-destructive">
                      {d.processingError?.slice(0, 80) ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
