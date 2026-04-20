import { logger } from "@academic-os/shared";

/**
 * Audit logger. Writes a structured record to the pino logger for every
 * action that modifies state (login, upload, delete, admin). Once the
 * `audit_logs` table lands in a migration, swap the `emit` function to
 * also `INSERT INTO audit_logs`.
 */

export type AuditAction =
  | "auth.login"
  | "auth.logout"
  | "auth.magic_link_sent"
  | "material.upload"
  | "material.delete"
  | "task.create"
  | "task.delete"
  | "admin.impersonate"
  | "admin.cohort_create"
  | "blackboard.sync";

export interface AuditRecord {
  action: AuditAction;
  userId: string | null;
  resource?: string; // e.g. "resource:<uuid>"
  meta?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export function audit(rec: AuditRecord): void {
  logger.info(
    {
      audit: true,
      action: rec.action,
      userId: rec.userId,
      resource: rec.resource,
      ip: rec.ip,
      userAgent: rec.userAgent,
      meta: rec.meta,
      at: new Date().toISOString(),
    },
    `audit ${rec.action}`,
  );
}

export function ipFromRequest(req: Request): string | undefined {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    undefined
  );
}
