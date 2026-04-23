import pino, { type Logger } from "pino";

/**
 * Structured JSON logger. Use instead of `console.log` in server code so
 * Vercel/Sentry can parse fields. Edge runtime uses a minimal fallback
 * because pino's transports depend on Node APIs.
 */

const isEdge = process.env.NEXT_RUNTIME === "edge";
const level = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug");

export const logger: Logger = isEdge
  ? (pino({ level, browser: { asObject: true } }) as unknown as Logger)
  : pino({
      level,
      base: {
        service: "academic-os-web",
        env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      redact: {
        paths: [
          "*.password",
          "*.token",
          "*.jwt",
          "*.authorization",
          "req.headers.authorization",
          "req.headers.cookie",
        ],
        censor: "[REDACTED]",
      },
    });

export function child(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}
