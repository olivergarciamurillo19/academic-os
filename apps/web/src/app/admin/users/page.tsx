import "server-only";

import { cohorts, db, memberships, users } from "@academic-os/db";
import { desc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Admin · Usuarios" };

export default async function AdminUsersPage() {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      createdAt: users.createdAt,
      role: memberships.role,
      cohortAcademicYear: cohorts.academicYear,
      cohortPeriod: cohorts.period,
    })
    .from(users)
    .leftJoin(memberships, eq(memberships.userId, users.id))
    .leftJoin(cohorts, eq(cohorts.id, memberships.cohortId))
    .orderBy(desc(users.createdAt))
    .limit(200);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-6 lg:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
        <p className="text-sm text-muted-foreground">
          Mostrando últimos {rows.length.toString()} por fecha de alta.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lista</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Email</th>
                  <th className="px-4 py-2 text-left font-medium">Nombre</th>
                  <th className="px-4 py-2 text-left font-medium">Rol</th>
                  <th className="px-4 py-2 text-left font-medium">Cohort</th>
                  <th className="px-4 py-2 text-left font-medium">Alta</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">{u.email}</td>
                    <td className="px-4 py-2">{u.fullName ?? "—"}</td>
                    <td className="px-4 py-2">{u.role ?? "—"}</td>
                    <td className="px-4 py-2">
                      {u.cohortAcademicYear ? `${u.cohortAcademicYear} ${u.cohortPeriod ?? ""}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {format(u.createdAt, "d MMM yyyy", { locale: es })}
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
