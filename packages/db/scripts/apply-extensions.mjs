import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
const sql = postgres(url, { prepare: false, max: 1, idle_timeout: 5 });

// Apply extensions one at a time so we can swallow failures for the
// cron/net extensions which often require Dashboard-level enablement.
const statements = [
  `create extension if not exists "pgcrypto"   with schema extensions;`,
  `create extension if not exists "uuid-ossp"  with schema extensions;`,
  `create extension if not exists "vector"     with schema extensions;`,
  `create extension if not exists "pg_net"     with schema extensions;`,
  `create extension if not exists "pg_cron"    with schema pg_catalog;`,
];

for (const stmt of statements) {
  try {
    await sql.unsafe(stmt);
    console.log("OK  ", stmt);
  } catch (err) {
    console.log("SKIP", stmt, "—", err.code, err.message);
  }
}
await sql.end();
