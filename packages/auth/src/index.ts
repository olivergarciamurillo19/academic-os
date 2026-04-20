// Client factories
export { createBrowserClient, createServerClient } from "./client.js";

// Session helpers & types
export type { ActiveMembership, MembershipStatus, SessionUser } from "./session.js";
export { getSessionUser } from "./session.js";

// Role helpers & types
export type { MembershipRole } from "./roles.js";
export { requireRole, canManageCohort } from "./roles.js";
