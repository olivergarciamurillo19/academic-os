/**
 * OAuth callback handler.
 *
 * Supabase Auth (PKCE flow) redirects the browser here after the identity
 * provider (Google) signs the user in. We swap the short-lived `code` for
 * a session; on success we decide where to land the user based on whether
 * they already have an active membership.
 *
 * Lives under /api/** so the root middleware excludes it and lets the
 * handler run without the auth redirect.
 */

import { db, memberships } from "@academic-os/db";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const providerError = searchParams.get("error");
  const next = searchParams.get("next");

  if (providerError) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(providerError)}`, origin),
    );
  }
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL("/login?error=unconfigured", origin));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (
        cookiesToSet: { name: string; value: string; options: CookieOptions }[],
      ) => {
        for (const { name, value, options } of cookiesToSet) {
          try {
            cookieStore.set(
              name,
              value,
              options as Parameters<typeof cookieStore.set>[2],
            );
          } catch {
            // See note in /auth/confirm.
          }
        }
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error !== null || data.user === null) {
    console.error("[auth/callback] exchange failed:", error?.message);
    return NextResponse.redirect(new URL("/login?error=exchange_failed", origin));
  }

  // Explicit `?next=…` wins (e.g. a chat page deep-linking into auth).
  if (next?.startsWith("/") === true) {
    return NextResponse.redirect(new URL(next, origin));
  }

  // Otherwise route by membership state.
  try {
    const rows = await db
      .select({ cohortId: memberships.cohortId })
      .from(memberships)
      .where(
        and(eq(memberships.userId, data.user.id), eq(memberships.status, "active")),
      )
      .limit(1);
    if (rows.length > 0) {
      return NextResponse.redirect(new URL("/dashboard", origin));
    }
  } catch (err) {
    console.error("[auth/callback] membership query failed:", err);
  }

  return NextResponse.redirect(new URL("/onboarding", origin));
}
