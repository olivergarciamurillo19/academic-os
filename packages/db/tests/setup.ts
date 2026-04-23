import postgres from "postgres";

export const SKIP = process.env.SKIP_DB_TESTS === "1" || !process.env.DATABASE_URL;

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  return postgres(url, { max: 1 });
}

export async function withTempSchema<T>(
  sql: ReturnType<typeof getSql>,
  fn: (schema: string) => Promise<T>,
): Promise<T> {
  const schema = `test_${Math.random().toString(36).slice(2, 10)}`;
  await sql.unsafe(`create schema if not exists "${schema}"`);
  try {
    return await fn(schema);
  } finally {
    await sql.unsafe(`drop schema if exists "${schema}" cascade`);
  }
}
