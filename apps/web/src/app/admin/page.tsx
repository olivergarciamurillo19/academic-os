import "server-only";

import {
  chunks,
  conversations,
  db,
  documents,
  generatedTests,
  messages,
  users,
} from "@academic-os/db";
import { count, eq, sql } from "drizzle-orm";
import { ActivitySquare, Database, MessageSquare, Users as UsersIcon, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Admin · Dashboard" };

interface Metric {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

export default async function AdminDashboardPage() {
  const [usersTotal, indexedDocs, convosTotal, chunksTotal, testsTotal, tokensRow] =
    await Promise.all([
      db.select({ c: count() }).from(users),
      db
        .select({ c: count() })
        .from(documents)
        .where(eq(documents.status, "indexed")),
      db.select({ c: count() }).from(conversations),
      db.select({ c: count() }).from(chunks),
      db.select({ c: count() }).from(generatedTests),
      db.execute<{ input: number | null; output: number | null }>(
        sql`SELECT
              COALESCE(SUM((token_usage->>'input')::int), 0)::int AS input,
              COALESCE(SUM((token_usage->>'output')::int), 0)::int AS output
            FROM messages WHERE token_usage IS NOT NULL`,
      ),
    ]);

  const tokenRow = Array.isArray(tokensRow)
    ? (tokensRow as { input: number | null; output: number | null }[])[0] ??
      { input: 0, output: 0 }
    : { input: 0, output: 0 };
  const totalTokens = (tokenRow.input ?? 0) + (tokenRow.output ?? 0);

  void messages;

  const metrics: Metric[] = [
    {
      label: "Usuarios",
      value: String(usersTotal[0]?.c ?? 0),
      icon: UsersIcon,
    },
    {
      label: "Documentos indexados",
      value: String(indexedDocs[0]?.c ?? 0),
      icon: Database,
    },
    {
      label: "Conversaciones",
      value: String(convosTotal[0]?.c ?? 0),
      icon: MessageSquare,
    },
    {
      label: "Chunks almacenados",
      value: String(chunksTotal[0]?.c ?? 0),
      icon: ActivitySquare,
    },
    {
      label: "Tests generados",
      value: String(testsTotal[0]?.c ?? 0),
      icon: Zap,
    },
    {
      label: "Tokens consumidos",
      value: formatCompact(totalTokens),
      icon: Zap,
      description: `input ${formatCompact(tokenRow.input ?? 0)} · output ${formatCompact(tokenRow.output ?? 0)}`,
    },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-6 lg:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Admin · Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Métricas agregadas del producto. Solo visibles para rol <code>admin</code>.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.label}>
              <CardHeader className="flex flex-row items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="flex flex-col">
                  <CardDescription>{m.label}</CardDescription>
                  <CardTitle className="text-2xl">{m.value}</CardTitle>
                  {m.description ? (
                    <span className="text-[10px] text-muted-foreground">{m.description}</span>
                  ) : null}
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/admin/users" className="group">
          <Card className="transition-colors group-hover:border-primary/60">
            <CardHeader>
              <CardTitle className="text-base">Usuarios →</CardTitle>
              <CardDescription>Lista con email, cohort, fecha de registro.</CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        </Link>
        <Link href="/admin/jobs" className="group">
          <Card className="transition-colors group-hover:border-primary/60">
            <CardHeader>
              <CardTitle className="text-base">Jobs →</CardTitle>
              <CardDescription>Estado de documents en pipeline.</CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        </Link>
      </div>
    </div>
  );
}

function formatCompact(n: number): string {
  if (n < 1_000) return String(n);
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n < 1_000_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  return `${(n / 1_000_000_000).toFixed(2)}B`;
}
