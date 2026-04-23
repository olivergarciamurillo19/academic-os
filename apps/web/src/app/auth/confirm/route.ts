/**
 * Magic-link callback handler.
 *
 * Supabase Auth sends an email with a link pointing at this route, carrying
 * ?token_hash=…&type=email (or magiclink / recovery / invite / signup).
 * We verify the OTP here so @supabase/ssr can write the session cookies
 * via setAll — otherwise the browser lands on /login with no cookies set
 * and bounces back through the middleware.
 *
 * Matcher: the root middleware already excludes `/auth/**` so this route
 * runs before the auth redirect kicks in.
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES = new Set<EmailOtpType>([
  "email",
  "magiclink",
  "signup",
  "invite",
  "recovery",
  "email_change",
]);

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && (VALID_TYPES as Set<string>).has(value);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next");

  if (!tokenHash || !isEmailOtpType(type)) {
    return NextResponse.redirect(new URL("/login?error=missing_link", origin));
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
            // setAll is called in contexts where set is a no-op (e.g. during
            // prerender). The redirect response we return below will still
            // include the cookies the server client queued on the headers.
          }
        }
      },
    },
  });

  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) {
    console.error("[auth/confirm] verifyOtp failed:", error.message);
    return NextResponse.redirect(new URL("/login?error=invalid_link", origin));
  }

  // `next` lets a caller pin where the user lands (e.g. back to a
  // specific subject). Recovery links default to the reset-password form
  // so the user can set a new password. Other types fall through to
  // onboarding; middleware redirects to /dashboard if they already have
  // a membership (see active_cohort_id cookie path).
  const fallback = type === "recovery" ? "/reset-password" : "/onboarding";
  const destination = next?.startsWith("/") === true ? next : fallback;
  return NextResponse.redirect(new URL(destination, origin));
}
