/**
 * App-level Supabase clients.
 *
 * - Server: see `./auth.ts` — cached per request, plumbs cookies.
 * - Browser: `getBrowserSupabase()` lazy singleton for client components
 *   (chat streaming, realtime subscriptions).
 *
 * Runtime env vars required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * When those are unset (current mock-mode production), `isSupabaseConfigured`
 * returns false so callers can fall back to local mocks without crashing.
 */

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export function isSupabaseConfigured(): boolean {
  return (
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
    typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0
  );
}

let browserClient: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient {
  if (browserClient !== null) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  browserClient = createBrowserClient(url, anon);
  return browserClient;
}
