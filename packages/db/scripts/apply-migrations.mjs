import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, idle_timeout: 5 });

const files = readdirSync("./migrations").filter((f) => f.endsWith(".sql")).sort();
console.log("Migrations:", files);

for (const file of files) {
  const path = join("./migrations", file);
  const raw = readFileSync(path, "utf8");
  // Drizzle splits at '--> statement-breakpoint'
  const statements = raw
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  console.log(`\n=== ${file} — ${statements.length} statements ===`);
  const IDEMPOTENT = new Set(["42710", "42P07", "42P06", "42701", "42P16", "42723"]);
  for (let i = 0; i < statements.length; i += 1) {
    const stmt = statements[i];
    try {
      await sql.unsafe(stmt);
      process.stdout.write(".");
    } catch (err) {
      if (IDEMPOTENT.has(err.code)) {
        process.stdout.write("·");
        continue;
      }
      console.error(`\nFAIL ${file} statement ${i + 1}/${statements.length}:`);
      console.error("  code:", err.code);
      console.error("  msg :", err.message);
      console.error("  sql :", stmt.slice(0, 300).replace(/\n/g, " "));
      process.exit(1);
    }
  }
  console.log(` ✓`);
  // Track in drizzle's migrations table so re-run skips.
  const hash = file.replace(/\.sql$/, "");
  await sql`
    CREATE SCHEMA IF NOT EXISTS drizzle;
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id serial PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    );
  `;
  await sql`
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
    VALUES (${hash}, ${Date.now()})
    ON CONFLICT DO NOTHING;
  `;
}

console.log("\n✅ All migrations applied.");
await sql.end();
