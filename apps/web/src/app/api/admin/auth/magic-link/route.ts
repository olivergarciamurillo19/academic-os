/**
 * Admin-only "give me a magic link for {email}" helper.
 *
 * Purpose: bypass Supabase's email-send rate limits during dev + QA by
 * generating the action link server-side with the service-role key and
 * returning it as JSON. Nothing is emailed — the token is valid because
 * generateLink signs it with the project JWT secret.
 *
 * Gated by the `ADMIN_DEV_TOKEN` env var. Returns 404 when the env is
 * unset so the route effectively disappears in hardened environments.
 *
 * Usage:
 *   GET /api/admin/auth/magic-link?token=$ADMIN_DEV_TOKEN&email=foo@bar.com
 *   → { ok: true, url: "https://…/auth/confirm?token_hash=…&type=magiclink" }
 *
 * The returned URL sends the user through /auth/confirm, which calls
 * supabase.auth.verifyOtp({ token_hash, type: 'magiclink' }) — the same
 * code path the real email flow uses — so the session cookies are
 * written identically.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getServiceRoleSupabase, hasServiceRoleKey } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  token: z.string().min(16),
  email: z.string().email(),
  next: z.string().startsWith("/").optional(),
});

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const expected = process.env.ADMIN_DEV_TOKEN;
  if (!expected) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY not set" },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    token: url.searchParams.get("token"),
    email: url.searchParams.get("email"),
    next: url.searchParams.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Bad query" }, { status: 400 });
  }

  if (!timingSafeEqual(parsed.data.token, expected)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  const confirmBase = `${appUrl}/auth/confirm`;

  const admin = getServiceRoleSupabase();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: parsed.data.email,
    options: {
      redirectTo: parsed.data.next
        ? `${confirmBase}?next=${encodeURIComponent(parsed.data.next)}`
        : confirmBase,
    },
  });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  }

  const hashedToken = data.properties?.hashed_token;
  if (!hashedToken) {
    return NextResponse.json(
      { ok: false, error: "generateLink returned no hashed_token" },
      { status: 500 },
    );
  }

  const params = new URLSearchParams({
    token_hash: hashedToken,
    type: "magiclink",
  });
  if (parsed.data.next) {
    params.set("next", parsed.data.next);
  }
  const directUrl = `${confirmBase}?${params.toString()}`;

  return NextResponse.json({
    ok: true,
    url: directUrl,
    action_link: data.properties.action_link,
    email: parsed.data.email,
  });
}
