import {
  createBrowserClient as createSupabaseBrowserClient,
  createServerClient as createSupabaseServerClient,
  type CookieMethodsServer,
} from "@supabase/ssr";

/**
 * Generic Database type placeholder until Supabase CLI generates the actual types.
 * Replace with the generated Database type from @academic-os/db or a dedicated types package.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Database = Record<string, any>;

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        `Ensure it is defined in your .env file.`,
    );
  }
  return value;
}

/**
 * Creates a Supabase client suitable for use in the browser (client components).
 * Reads credentials from NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export function createBrowserClient<TDatabase = Database>() {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createSupabaseBrowserClient<TDatabase>(supabaseUrl, supabaseAnonKey);
}

/**
 * Creates a Supabase client suitable for use on the server (server components, route handlers, middleware).
 * Requires a cookie store that implements the CookieMethodsServer interface.
 *
 * @param cookieStore - An object implementing CookieMethodsServer (e.g. from next/headers cookies())
 */
export function createServerClient<TDatabase = Database>(
  cookieStore: CookieMethodsServer,
) {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createSupabaseServerClient<TDatabase>(supabaseUrl, supabaseAnonKey, {
    cookies: cookieStore,
  });
}
