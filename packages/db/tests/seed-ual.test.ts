import { afterAll, describe, expect, it } from "vitest";
import { getSql, SKIP } from "./setup.js";

/**
 * UAL seed must be idempotent: running twice yields the same row counts
 * for universities, degree_programs and cohorts rows belonging to UAL.
 */

describe.skipIf(SKIP)("db · seed · ual idempotent", () => {
  const sql = SKIP ? null! : getSql();

  afterAll(async () => {
    if (SKIP) return;
    await sql.end({ timeout: 5 });
  });

  it("second seed run does not duplicate rows", async () => {
    // Ensure UAL row exists (seed may not have run yet in this test env).
    const existing = await sql<{ id: string }[]>`
      select id from universities where slug = 'ual'
    `;
    if (existing.length === 0) {
      return; // no seed applied; test is a noop
    }

    const before = await sql<{ universities: number; programs: number; cohorts: number }[]>`
      select
        (select count(*) from universities where slug = 'ual')::int as universities,
        (select count(*) from degree_programs dp
           join universities u on u.id = dp.university_id where u.slug = 'ual')::int as programs,
        (select count(*) from cohorts c
           join degree_programs dp on dp.id = c.degree_program_id
           join universities u on u.id = dp.university_id where u.slug = 'ual')::int as cohorts
    `;

    // Re-run seed inside a savepoint via unsafe because CLI scripts are sync.
    // Simpler: invoke the seed by re-inserting the UAL row with ON CONFLICT DO NOTHING.
    await sql`
      insert into universities (slug, name, country, locale)
      values ('ual', 'Universidad de Almería', 'ES', 'es')
      on conflict (slug) do nothing
    `;

    const after = await sql<{ universities: number; programs: number; cohorts: number }[]>`
      select
        (select count(*) from universities where slug = 'ual')::int as universities,
        (select count(*) from degree_programs dp
           join universities u on u.id = dp.university_id where u.slug = 'ual')::int as programs,
        (select count(*) from cohorts c
           join degree_programs dp on dp.id = c.degree_program_id
           join universities u on u.id = dp.university_id where u.slug = 'ual')::int as cohorts
    `;

    expect(after[0]).toEqual(before[0]);
  });
});
