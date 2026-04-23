import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import * as schema from "./schema/index.js";

// Lazy initialisation — Next.js' build step imports server modules to
// collect page data; we cannot throw at module scope because DATABASE_URL
// is not guaranteed to be present then. We connect on first access and
// cache the client for the process lifetime.

type Schema = typeof schema;
type DbType = PostgresJsDatabase<Schema>;

let cachedClient: Sql | null = null;
let cachedDb: DbType | null = null;

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required to reach Postgres");
  }
  return url;
}

function ensureClient(): { client: Sql; db: DbType } {
  if (cachedClient === null || cachedDb === null) {
    const sql = postgres(getDatabaseUrl(), { prepare: false });
    cachedClient = sql;
    cachedDb = drizzle(sql, { schema });
  }
  return { client: cachedClient, db: cachedDb };
}

export const db: DbType = new Proxy({} as DbType, {
  get(_target, prop: string | symbol) {
    const real = ensureClient().db as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? (value as () => unknown).bind(real) : value;
  },
});

export const client: Sql = new Proxy({} as Sql, {
  get(_target, prop: string | symbol) {
    const real = ensureClient().client as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? (value as () => unknown).bind(real) : value;
  },
  apply(_target, _this, args: unknown[]) {
    const c = ensureClient().client as unknown as (...a: unknown[]) => unknown;
    return c(...args);
  },
});
