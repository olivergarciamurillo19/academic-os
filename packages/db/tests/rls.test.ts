import { afterAll, describe, expect, it } from "vitest";
import { getSql, SKIP } from "./setup.js";

/**
 * RLS isolation: user A must not see user B's private rows.
 *
 * Requires the RLS policies from migration 0002/0003 applied and the
 * `auth.uid()` Supabase helper available. Skipped when DATABASE_URL is not
 * set or when RLS policies are absent.
 */

describe.skipIf(SKIP)("db · rls · user isolation", () => {
  const sql = SKIP ? null! : getSql();

  afterAll(async () => {
    if (SKIP) return;
    await sql.end({ timeout: 5 });
  });

  it("user A cannot read user B rows via authenticated role", async () => {
    // Skip gracefully if the auth schema is not present (non-Supabase Postgres).
    const authExists = await sql<{ exists: boolean }[]>`
      select exists(
        select 1 from information_schema.schemata where schema_name = 'auth'
      ) as exists
    `;
    if (!authExists[0]?.exists) {
      return; // local non-Supabase — nothing to test
    }

    // Create two auth users via Supabase's auth.users table (admin path).
    const userA = await sql<{ id: string }[]>`
      insert into auth.users (id, email, instance_id)
      values (gen_random_uuid(), 'a@test.local', '00000000-0000-0000-0000-000000000000')
      returning id
    `;
    const userB = await sql<{ id: string }[]>`
      insert into auth.users (id, email, instance_id)
      values (gen_random_uuid(), 'b@test.local', '00000000-0000-0000-0000-000000000000')
      returning id
    `;

    const aId = userA[0]!.id;
    const bId = userB[0]!.id;

    await sql`
      insert into users (id, email, display_name)
      values (${aId}, 'a@test.local', 'A'), (${bId}, 'b@test.local', 'B')
    `;

    // Switch to authenticated role as A; B's row must be invisible.
    await sql.begin(async (tx) => {
      await tx`set local role authenticated`;
      await tx`set local request.jwt.claim.sub = ${aId}`;
      const rows =
        await tx<{ id: string }[]>`select id from users where id = ${bId}`;
      expect(rows.length).toBe(0);
    });

    // Cleanup
    await sql`delete from auth.users where id in (${aId}, ${bId})`;
  });
});
