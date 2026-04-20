import postgres from "postgres";

export const SKIP = process.env.SKIP_DB_TESTS === "1" || !process.env.DATABASE_URL;

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  return postgres(url, { max: 1 });
}
