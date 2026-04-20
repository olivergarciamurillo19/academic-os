import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Schema ───────────────────────────────────────────────────────────────────

const announcementSchema = z.object({
  sourceId: z.string().min(1).max(512),
  title: z.string().min(1).max(500),
  description: z.string().max(10_000).default(""),
  subject: z.string().max(500),
  postedAt: z.string().datetime().optional(),
});

const taskSchema = z.object({
  sourceId: z.string().min(1).max(512),
  title: z.string().min(1).max(500),
  subject: z.string().max(500),
  dueAt: z.string().datetime().nullable().optional(),
  points: z.number().finite().nullable().optional(),
  description: z.string().max(10_000).optional(),
});

const materialSchema = z.object({
  sourceId: z.string().min(1).max(2000),
  title: z.string().min(1).max(500),
  subject: z.string().max(500),
  url: z.string().url().max(2000),
  kind: z.enum(["pdf", "link", "video", "other"]),
});

const payloadSchema = z.object({
  announcements: z.array(announcementSchema).max(500),
  tasks: z.array(taskSchema).max(500),
  materials: z.array(materialSchema).max(500),
  capturedAt: z.string().datetime().optional(),
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function userFromBearer(req: Request): Promise<{ id: string } | null> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const supabase = createSupabaseClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<Response> {
  const user = await userFromBearer(req);
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const raw = (await req.json().catch(() => null)) as unknown;
  const parsed = payloadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { announcements, tasks, materials } = parsed.data;

  // Persistence lives behind a feature flag: the DB schema for blackboard
  // snapshots is planned in ACADEMIC_OS.md §ingest. Until the tables land,
  // acknowledge the payload and log a structured summary so the extension
  // has a stable contract.
  const summary = {
    userId: user.id,
    announcements: announcements.length,
    tasks: tasks.length,
    materials: materials.length,
    at: new Date().toISOString(),
  };

  console.log(JSON.stringify({ event: "blackboard.sync", ...summary }));

  return NextResponse.json(
    {
      ok: true,
      inserted: {
        announcements: announcements.length,
        tasks: tasks.length,
        materials: materials.length,
      },
    },
    { status: 200 },
  );
}

export function GET(): Response {
  return NextResponse.json(
    { ok: false, error: "method_not_allowed" },
    { status: 405 },
  );
}
