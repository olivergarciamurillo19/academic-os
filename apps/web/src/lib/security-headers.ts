/**
 * Security headers for Academic OS. Consumed from `next.config.mjs` via:
 *
 *   import { securityHeaders } from "./src/lib/security-headers";
 *   async headers() { return [{ source: "/:path*", headers: securityHeaders() }]; }
 *
 * Split out so the policy has a single source of truth and can be covered
 * by a unit test without booting Next.
 */

export interface SecurityHeader {
  key: string;
  value: string;
}

function csp(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.posthog.com https://*.sentry.io https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://*.gravatar.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.openai.com https://api.anthropic.com https://*.inngest.com https://*.posthog.com https://*.sentry.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function securityHeaders(): SecurityHeader[] {
  return [
    { key: "Content-Security-Policy", value: csp() },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value:
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    },
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    },
  ];
}
