import { db } from "@academic-os/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Probe {
  name: string;
  ok: boolean;
  latencyMs: number;
  detail?: string;
}

interface HealthResponse {
  status: "ok" | "degraded";
  version: string;
  env: string;
  timestamp: string;
  latencyMs: number;
  probes: Probe[];
}

async function time<T>(name: string, fn: () => Promise<T>): Promise<Probe> {
  const start = Date.now();
  try {
    await fn();
    return { name, ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      name,
      ok: false,
      latencyMs: Date.now() - start,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

async function probeDb(): Promise<Probe> {
  return time("db", async () => {
    await db.execute(sql`SELECT 1`);
  });
}

async function probeStorage(): Promise<Probe> {
  return time("storage", async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("supabase_env_missing");
    const resp = await fetch(`${url}/storage/v1/bucket`, {
      headers: { Authorization: `Bearer ${key}`, apikey: key },
      signal: AbortSignal.timeout(3000),
    });
    if (!resp.ok) throw new Error(`storage_http_${resp.status}`);
  });
}

async function probeLlm(): Promise<Probe> {
  return time("llm", async () => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("openai_key_missing");
    const resp = await fetch("https://api.openai.com/v1/models", {
      method: "HEAD",
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(3000),
    });
    if (!resp.ok) throw new Error(`llm_http_${resp.status}`);
  });
}

async function probeInngest(): Promise<Probe> {
  return time("inngest", async () => {
    const base = process.env.INNGEST_API_BASE ?? "https://api.inngest.com";
    const resp = await fetch(`${base}/health`, {
      signal: AbortSignal.timeout(3000),
    }).catch(() => null);
    if (!resp?.ok) throw new Error("inngest_unreachable");
  });
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const start = Date.now();
  const [dbP, storageP, llmP, inngestP] = await Promise.all([
    probeDb(),
    probeStorage(),
    probeLlm(),
    probeInngest(),
  ]);

  const probes = [dbP, storageP, llmP, inngestP];
  const allOk = probes.every((p) => p.ok);

  const body: HealthResponse = {
    status: allOk ? "ok" : "degraded",
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - start,
    probes,
  };

  return NextResponse.json(body, { status: allOk ? 200 : 503 });
}
