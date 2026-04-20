/**
 * Central limits for Drizzle queries. Import these instead of sprinkling
 * magic numbers so we can grep for hot paths when tuning performance.
 */

export const QUERY_LIMITS = {
  dashboardTasks: 25,
  dashboardEvents: 50,
  subjectMaterials: 100,
  subjectTopics: 100,
  chatHistory: 50,
  chatRetrievalTopK: 8,
  notificationsFeed: 30,
  auditLogsPerPage: 50,
} as const;

export type QueryLimit = keyof typeof QUERY_LIMITS;
