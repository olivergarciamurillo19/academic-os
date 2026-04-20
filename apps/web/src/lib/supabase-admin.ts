/**
 * Server-only Supabase client with the service_role key.
 *
 * Used by server actions and route handlers that need to bypass RLS
 * (e.g. Storage uploads that write rows with `owner_user_id = <user>`
 * after the user's own auth check has already succeeded). Never import
 * this from client code.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only: this module must never be imported from client code —
// it exposes a service_role key with the ability to bypass RLS.
let adminClient: SupabaseClient | null = null;

export function getServiceRoleSupabase(): SupabaseClient {
  if (adminClient !== null) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase service role is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

export function hasServiceRoleKey(): boolean {
  return (
    typeof process.env.SUPABASE_SERVICE_ROLE_KEY === "string" &&
    process.env.SUPABASE_SERVICE_ROLE_KEY.length > 0
  );
}
