import { NextResponse } from "next/server";

import { listNotifications } from "@/features/notifications/queries";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await listNotifications(10);
  return NextResponse.json({
    items: items.map((i) => ({
      id: i.id,
      kind: i.kind,
      title: i.title,
      body: i.body,
      href: i.href,
      createdAt: i.createdAt.toISOString(),
    })),
  });
}
