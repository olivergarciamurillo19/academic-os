import { Resend } from "resend";

// Lazy client: Next.js build-time imports server modules to collect page
// data. We cannot throw at module scope because the env var is not
// guaranteed to be present during build. First real use throws if missing.

let cached: Resend | null = null;

export function getResend(): Resend {
  if (cached !== null) return cached;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required but was not set");
  }
  cached = new Resend(apiKey);
  return cached;
}

export const resend = new Proxy({} as Resend, {
  get(_target, prop: string | symbol) {
    const real = getResend() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? (value as () => unknown).bind(real) : value;
  },
});
