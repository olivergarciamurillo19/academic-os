#!/usr/bin/env -S tsx
/**
 * scripts/check-migrations.ts
 *
 * Verifica invariantes sobre packages/db/migrations y el schema Drizzle:
 *  1. Cada migración .sql debe tener un bloque "-- rollback" como comentario.
 *  2. Toda tabla con >= 1 columna _id o user_id debe tener un índice por esa
 *     columna (detectado en el SQL de migración).
 *  3. Toda tabla debe tener RLS ENABLE en alguna migración.
 *
 * Salida: imprime hallazgos y sale con código != 0 si falta algo crítico.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "packages/db/migrations");

interface Finding {
  level: "warn" | "error";
  file: string;
  message: string;
}

function loadMigrations(): { file: string; sql: string }[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((file) => ({ file, sql: readFileSync(join(MIGRATIONS_DIR, file), "utf8") }));
}

function checkRollback(migrations: ReturnType<typeof loadMigrations>): Finding[] {
  return migrations
    .filter((m) => !/-- ?rollback/i.test(m.sql))
    .map((m) => ({
      level: "warn",
      file: m.file,
      message: "no contiene bloque `-- rollback:` — añade SQL inverso en comentario",
    }));
}

function checkRlsEnabled(sqlAll: string): Finding[] {
  const tables = [
    "universities",
    "cohorts",
    "users",
    "memberships",
    "subjects",
    "subject_members",
    "topics",
    "resources",
    "documents",
    "events",
    "tasks",
    "reminders",
    "integrations",
    "chunks",
    "conversations",
    "messages",
  ];
  return tables
    .filter((t) => !new RegExp(`alter table\\s+(public\\.)?${t}\\s+enable row level security`, "i").test(sqlAll))
    .map((t) => ({
      level: "error" as const,
      file: "<any migration>",
      message: `tabla ${t} sin \`ENABLE ROW LEVEL SECURITY\` en ninguna migración`,
    }));
}

function checkForeignKeyIndexes(migrations: ReturnType<typeof loadMigrations>): Finding[] {
  const joined = migrations.map((m) => m.sql).join("\n");
  // Match "columnName uuid ... references table(id)" across create table statements
  const fkRe = /"([a-z_]+)_id"\s+uuid[^,]*references\s+"?([a-z_]+)"?/gi;
  const fks = new Set<string>();
  for (const match of joined.matchAll(fkRe)) {
    fks.add(match[1]!);
  }
  const findings: Finding[] = [];
  for (const col of fks) {
    const hasIdx = new RegExp(`create\\s+index[^;]*on[^;]*${col}_id`, "i").test(joined);
    if (!hasIdx) {
      findings.push({
        level: "warn",
        file: "<any migration>",
        message: `columna ${col}_id sin índice — FKs sin índice degradan join y cascade`,
      });
    }
  }
  return findings;
}

function main() {
  const migrations = loadMigrations();
  const all = migrations.map((m) => m.sql).join("\n");
  const findings: Finding[] = [
    ...checkRollback(migrations),
    ...checkRlsEnabled(all),
    ...checkForeignKeyIndexes(migrations),
  ];

  if (findings.length === 0) {
    console.log("[check-migrations] OK — sin hallazgos.");
    return;
  }

  for (const f of findings) {
    const prefix = f.level === "error" ? "ERROR" : "warn";
    console.log(`[check-migrations] [${prefix}] ${f.file}: ${f.message}`);
  }

  if (findings.some((f) => f.level === "error")) {
    process.exit(1);
  }
}

main();
