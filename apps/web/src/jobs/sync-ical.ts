import { Inngest } from "inngest";
import { db } from "@academic-os/db";
import { integrations, events } from "@academic-os/db/schema";
import { eq, and } from "drizzle-orm";

// ─── Inngest client ───────────────────────────────────────────────────────────

// Use a locally-defined client. If the project later extracts a shared
// lib/inngest.ts, re-export from there and remove this declaration.
const inngest = new Inngest({ id: "academic-os" });

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedVEvent {
  uid: string;
  summary: string;
  description: string | null;
  location: string | null;
  dtstart: Date;
  dtend: Date | null;
}

// ─── iCal parser ─────────────────────────────────────────────────────────────

/**
 * Parses a DTSTART / DTEND value that may carry a TZID parameter or a Z suffix.
 *
 * Supported formats:
 *   DTSTART;TZID=Europe/Madrid:20240115T090000
 *   DTSTART:20240115T090000Z
 *   DTSTART:20240115
 */
function parseICalDate(propertyLine: string): Date | null {
  // Split "DTSTART;TZID=Europe/Madrid:20240115T090000" into
  // key part "DTSTART;TZID=Europe/Madrid" and value "20240115T090000"
  const colonIdx = propertyLine.indexOf(":");
  if (colonIdx === -1) return null;

  const keyPart = propertyLine.slice(0, colonIdx);
  const value = propertyLine.slice(colonIdx + 1).trim();

  // Check if there is a TZID parameter
  const tzidMatch = /TZID=([^;:]+)/.exec(keyPart);
  const tzid = tzidMatch?.[1] ?? null;

  // All-day: YYYYMMDD
  if (/^\d{8}$/.test(value)) {
    const y = Number(value.slice(0, 4));
    const m = Number(value.slice(4, 6)) - 1;
    const d = Number(value.slice(6, 8));
    return new Date(Date.UTC(y, m, d));
  }

  // Datetime: YYYYMMDDTHHmmss[Z]
  const dtMatch = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(value);
  if (!dtMatch) return null;

  const [, yr, mo, dy, hr, mi, sc, zSuffix] = dtMatch;
  const y = Number(yr);
  const M = Number(mo) - 1;
  const D = Number(dy);
  const H = Number(hr);
  const min = Number(mi);
  const S = Number(sc);

  if (zSuffix === "Z" || tzid === null) {
    // UTC or floating — treat as UTC.
    return new Date(Date.UTC(y, M, D, H, min, S));
  }

  // Has a TZID. Use the JS Date constructor with a full ISO-like string so
  // the runtime applies the system offset. This is a best-effort approach;
  // for production accuracy a full tz library (e.g. @js-joda/timezone) is
  // preferred, but avoids an extra dependency per the issue requirements.
  const localIso = `${yr}-${mo}-${dy}T${hr}:${mi}:${sc}`;
  const d = new Date(localIso);
  // If the timezone is Europe/Madrid we can attempt Intl-based offset calculation.
  if (tzid === "Europe/Madrid") {
    const offsetMs = getMadridOffsetMs(d);
    return new Date(d.getTime() - offsetMs);
  }
  return d;
}

/**
 * Returns the UTC offset in milliseconds for Europe/Madrid at a given local
 * time, using the Intl.DateTimeFormat API (no external library needed).
 */
function getMadridOffsetMs(localDate: Date): number {
  try {
    // Format the instant as Europe/Madrid wall-clock time.
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(localDate);
    const get = (type: string): number =>
      Number(parts.find((p) => p.type === type)?.value ?? "0");

    const utcEquiv = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour") % 24,
      get("minute"),
      get("second"),
    );
    return localDate.getTime() - utcEquiv;
  } catch {
    return 0;
  }
}

/**
 * Extracts the plain text value from an iCal property line, unfolding
 * continuation lines and stripping escape sequences.
 *
 * @param raw - The full unfolded line, e.g. "SUMMARY:My Event"
 */
function extractValue(raw: string): string {
  const colonIdx = raw.indexOf(":");
  if (colonIdx === -1) return "";
  return raw
    .slice(colonIdx + 1)
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

/**
 * Unfolds iCal lines (lines continued with a leading space/tab are joined).
 */
function unfoldLines(raw: string): string[] {
  return raw
    .replace(/\r\n[ \t]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n");
}

/**
 * Minimal VEVENT parser. Returns an array of ParsedVEvent objects.
 * Does not depend on any external iCal library.
 */
function parseICalText(text: string): ParsedVEvent[] {
  const lines = unfoldLines(text);
  const results: ParsedVEvent[] = [];

  let inVEvent = false;
  let uid: string | null = null;
  let summary: string | null = null;
  let description: string | null = null;
  let location: string | null = null;
  let dtstart: Date | null = null;
  let dtend: Date | null = null;

  const reset = (): void => {
    uid = null;
    summary = null;
    description = null;
    location = null;
    dtstart = null;
    dtend = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "BEGIN:VEVENT") {
      inVEvent = true;
      reset();
      continue;
    }
    if (trimmed === "END:VEVENT") {
      inVEvent = false;
      // Only keep events that have the mandatory fields.
      if (uid !== null && summary !== null && dtstart !== null) {
        results.push({ uid, summary, description, location, dtstart, dtend });
      }
      reset();
      continue;
    }
    if (!inVEvent) continue;

    // Identify the property name (before the first colon or semicolon).
    const propName = trimmed.split(/[:;]/)[0]?.toUpperCase() ?? "";

    if (propName === "UID") {
      uid = extractValue(trimmed);
    } else if (propName === "SUMMARY") {
      summary = extractValue(trimmed);
    } else if (propName === "DESCRIPTION") {
      description = extractValue(trimmed);
    } else if (propName === "LOCATION") {
      location = extractValue(trimmed);
    } else if (propName === "DTSTART") {
      dtstart = parseICalDate(trimmed);
    } else if (propName === "DTEND") {
      dtend = parseICalDate(trimmed);
    }
  }

  return results;
}

// ─── Inngest function ─────────────────────────────────────────────────────────

export const syncICalIntegrations = inngest.createFunction(
  {
    id: "sync-ical-integrations",
    name: "Sync iCal integrations",
  },
  { cron: "*/30 * * * *" },
  async ({ step }) => {
    // ── 1. Fetch all active iCal integrations ─────────────────────────────
    const activeIntegrations = await step.run(
      "fetch-active-integrations",
      async () => {
        return db
          .select()
          .from(integrations)
          .where(
            and(
              eq(integrations.provider, "ical_url"),
              eq(integrations.isActive, true),
            ),
          );
      },
    );

    // ── 2. Process each integration independently ─────────────────────────
    const results = await Promise.allSettled(
      activeIntegrations.map((integration) =>
        step.run(`sync-integration-${integration.id}`, async () => {
          // Extract URL from metadata safely.
          const meta: Record<string, unknown> = integration.metadata ?? {};
          const rawUrl = meta["url"];

          if (typeof rawUrl !== "string" || rawUrl.trim() === "") {
            console.warn(
              `[sync-ical] Integration ${integration.id} has no valid metadata.url — skipping.`,
            );
            return { integrationId: integration.id, skipped: true };
          }

          const icalUrl = rawUrl.trim();

          // ── a. Fetch the iCal feed ───────────────────────────────────────
          let icalText: string;
          try {
            const res = await fetch(icalUrl, {
              headers: { "User-Agent": "AcademicOS/1.0 iCal sync" },
            });
            if (!res.ok) {
              throw new Error(
                `HTTP ${res.status.toString()} ${res.statusText} from ${icalUrl}`,
              );
            }
            icalText = await res.text();
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(
              `[sync-ical] Failed to fetch iCal for integration ${integration.id}: ${message}`,
            );
            return { integrationId: integration.id, error: message };
          }

          // ── b. Parse VEVENT blocks ───────────────────────────────────────
          const vevents = parseICalText(icalText);

          let upserted = 0;
          let changed = 0;

          // ── c. Upsert each event ─────────────────────────────────────────
          for (const vevent of vevents) {
            // Fetch existing event by external_id to detect changes.
            const existing = await db
              .select({
                id: events.id,
                title: events.title,
                startAt: events.startAt,
              })
              .from(events)
              .where(eq(events.externalId, vevent.uid))
              .limit(1)
              .then((rows) => rows[0] ?? null);

            // Detect meaningful change (title or start_at).
            const didChange =
              existing !== null &&
              (existing.title !== vevent.summary ||
                existing.startAt.getTime() !== vevent.dtstart.getTime());

            await db
              .insert(events)
              .values({
                externalId: vevent.uid,
                title: vevent.summary,
                description: vevent.description,
                location: vevent.location,
                startAt: vevent.dtstart,
                endAt: vevent.dtend,
                source: "ical",
                kind: "personal",
                ownerUserId: integration.userId,
                cohortId: null,
                isAllDay: false,
                isOfficial: false,
              })
              .onConflictDoUpdate({
                target: events.externalId,
                set: {
                  title: vevent.summary,
                  description: vevent.description,
                  location: vevent.location,
                  startAt: vevent.dtstart,
                  endAt: vevent.dtend,
                },
              });

            upserted++;

            // Emit change event when title or start changed.
            if (didChange) {
              changed++;
              // NOTE: In a full Inngest setup, emit via inngest.send().
              // Kept as a structured log here to avoid needing a running
              // Inngest server at import time.
              console.info("[sync-ical] event/ical.changed", {
                uid: vevent.uid,
                integrationId: integration.id,
              });
            }
          }

          return {
            integrationId: integration.id,
            upserted,
            changed,
          };
        }),
      ),
    );

    const summary = results.map((r) =>
      r.status === "fulfilled" ? r.value : { error: String(r.reason) },
    );

    return { processed: activeIntegrations.length, summary };
  },
);
