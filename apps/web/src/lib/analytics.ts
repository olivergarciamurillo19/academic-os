/**
 * Strongly-typed analytics event helper.
 * All event names + payload shapes live here. If the key is missing the
 * call is a silent no-op so dev and CI do not need PostHog creds.
 */
"use client";

import posthog from "posthog-js";

export type AnalyticsEvent =
  | { name: "user_signed_up"; payload: { method: "password" } }
  | { name: "onboarding_completed"; payload: { subjectCount: number } }
  | { name: "subject_opened"; payload: { subjectId: string } }
  | {
      name: "resource_uploaded";
      payload: { subjectId: string; topicKind: "theory" | "practice"; mime: string; bytes: number };
    }
  | { name: "chat_message_sent"; payload: { subjectId: string; characters: number } }
  | {
      name: "test_generated";
      payload: {
        subjectId: string;
        count: number;
        difficulty: "easy" | "medium" | "hard";
        type: string;
      };
    }
  | {
      name: "test_completed";
      payload: { subjectId: string; correct: number; total: number; seconds: number };
    };

let initialized = false;

function ensureInit(): boolean {
  if (initialized) return true;
  if (typeof window === "undefined") return false;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
  if (!key) return false;
  posthog.init(key, {
    api_host: host,
    capture_pageview: false, // handled manually to play well with App Router
    autocapture: false,
    person_profiles: "identified_only",
  });
  initialized = true;
  return true;
}

export function track<E extends AnalyticsEvent>(event: E): void {
  if (!ensureInit()) return;
  posthog.capture(event.name, event.payload as Record<string, unknown>);
}

export function identify(userId: string, traits?: Record<string, unknown>): void {
  if (!ensureInit()) return;
  posthog.identify(userId, traits);
}

export function pageview(pathname: string, search = ""): void {
  if (!ensureInit()) return;
  posthog.capture("$pageview", { $current_url: pathname + search });
}
