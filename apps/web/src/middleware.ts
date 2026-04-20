import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     *  - /login
     *  - /api/public/**
     *  - /_next/**
     *  - /favicon.ico
     *  - static file extensions.
     */
    "/((?!login|api/public|_next|favicon\\.ico|.*\\.(?:png|jpg|svg|ico|css|js|woff2)$).*)",
  ],
};

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;

  // If Supabase is not configured yet (local dev without .env.local, or a
  // staging deploy missing secrets) fall through. The client-side mock
  // stores under /dashboard, /subjects, /tasks keep working.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  // Build response that we will mutate with cookie updates.
  let response = NextResponse.next({ request });

  // ── 1. Create Supabase server client ───────────────────────────────────────
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[],
      ) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(
            name,
            value,
            options as Parameters<typeof response.cookies.set>[2],
          );
        }
      },
    },
  });

  // ── 2. Verify authentication ───────────────────────────────────────────────
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError !== null || userData.user === null) {
    // Allow onboarding to be seen without auth so the flow itself can run
    // (it will sign in via Supabase Auth before completing). Other routes
    // redirect to /login.
    if (pathname.startsWith("/onboarding")) {
      return response;
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", encodeURIComponent(pathname + search));
    return NextResponse.redirect(loginUrl);
  }

  const user = userData.user;

  // ── 3. Check cohort membership ────────────────────────────────────────────
  const existingCohortId = request.cookies.get("active_cohort_id")?.value;
  if (existingCohortId !== undefined && existingCohortId.length > 0) {
    return response;
  }

  // Slow path: query memberships table for an active membership.
  const { data: membershipRows, error: membershipError } = await supabase
    .from("memberships")
    .select("id, cohort_id, role, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("joined_at", { ascending: false })
    .limit(1);

  if (membershipError !== null) {
    console.error("[middleware] membership query failed:", membershipError.message);
    return response;
  }

  const firstMembership = membershipRows?.[0] as
    | { id: string; cohort_id: string; role: string; status: string }
    | undefined;

  // ── 4. Redirect to onboarding if no active membership ─────────────────────
  if (firstMembership === undefined) {
    if (pathname.startsWith("/onboarding")) {
      return response;
    }
    const onboardingUrl = request.nextUrl.clone();
    onboardingUrl.pathname = "/onboarding";
    onboardingUrl.search = "";
    return NextResponse.redirect(onboardingUrl);
  }

  // ── 5. Set active_cohort_id cookie on response ────────────────────────────
  response.cookies.set("active_cohort_id", firstMembership.cohort_id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
