import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getSql, SKIP } from "./setup.js";

/**
 * Happy-path insert smoke tests. Run with:
 *   DATABASE_URL=postgres://... pnpm --filter @academic-os/db test
 *
 * Skipped when DATABASE_URL is not set so CI stays green without a live DB.
 */

describe.skipIf(SKIP)("db · inserts · happy path", () => {
  const sql = SKIP ? null! : getSql();

  beforeAll(async () => {
    if (SKIP) return;
    // Ensure required extensions exist — harmless if already installed.
    await sql`create extension if not exists "uuid-ossp"`;
    await sql`create extension if not exists "pgcrypto"`;
  });

  afterAll(async () => {
    if (SKIP) return;
    await sql.end({ timeout: 5 });
  });

  it("inserts a university and reads it back", async () => {
    const slug = `ual-test-${Date.now()}`;
    const [row] = await sql<{ id: string; slug: string }[]>`
      insert into universities (slug, name, country, locale)
      values (${slug}, 'Test University', 'ES', 'es')
      returning id, slug
    `;
    expect(row).toBeDefined();
    expect(row!.slug).toBe(slug);

    // Cleanup
    await sql`delete from universities where id = ${row!.id}`;
  });

  it("cascade deletes a cohort from its university", async () => {
    const slug = `cascade-${Date.now()}`;
    const [u] = await sql<{ id: string }[]>`
      insert into universities (slug, name, country, locale)
      values (${slug}, 'Cascade U', 'ES', 'es')
      returning id
    `;
    const [degree] = await sql<{ id: string }[]>`
      insert into degree_programs (university_id, code, name, kind)
      values (${u!.id}, 'ING-INF', 'Ingeniería Informática', 'bachelor')
      returning id
    `;
    const [cohort] = await sql<{ id: string }[]>`
      insert into cohorts (degree_program_id, label, start_year)
      values (${degree!.id}, '2024-2025', 2024)
      returning id
    `;
    expect(cohort!.id).toBeDefined();

    await sql`delete from universities where id = ${u!.id}`;
    const rows = await sql`select id from cohorts where id = ${cohort!.id}`;
    expect(rows.length).toBe(0);
  });
});
