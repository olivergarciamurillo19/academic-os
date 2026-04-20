import { db } from "@academic-os/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

interface HealthResponse {
  status: "ok" | "degraded";
  db: boolean;
  timestamp: string;
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  let dbHealthy = false;

  try {
    await db.execute(sql`SELECT 1`);
    dbHealthy = true;
  } catch {
    // DB unreachable — degrade gracefully
  }

  const body: HealthResponse = {
    status: dbHealthy ? "ok" : "degraded",
    db: dbHealthy,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, { status: 200 });
}
