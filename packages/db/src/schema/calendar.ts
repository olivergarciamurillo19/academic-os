import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  smallint,
  timestamp,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users, cohorts } from "./identity.js";
import { subjects } from "./academic.js";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const eventKindEnum = pgEnum("event_kind", [
  "class",
  "exam",
  "deadline",
  "study_session",
  "personal",
]);

export const eventSourceEnum = pgEnum("event_source", [
  "manual",
  "ical",
  "google_calendar",
  "blackboard",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "doing",
  "done",
  "archived",
]);

export const reminderChannelEnum = pgEnum("reminder_channel", [
  "email",
  "push",
  "inapp",
]);

export const integrationProviderEnum = pgEnum("integration_provider", [
  "google_calendar",
  "ical_url",
  "blackboard_ext",
]);

// ─── Tables ──────────────────────────────────────────────────────────────────

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    cohortId: uuid("cohort_id").references(() => cohorts.id, { onDelete: "set null" }),
    ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }),
    location: text("location"),
    kind: eventKindEnum("kind").notNull().default("personal"),
    source: eventSourceEnum("source").notNull().default("manual"),
    externalId: text("external_id"),
    color: text("color"),
    isAllDay: boolean("is_all_day").notNull().default(false),
    isOfficial: boolean("is_official").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Critical indexes from §6.3
    index("idx_events_owner_start").on(t.ownerUserId, t.startAt),
    index("idx_events_cohort_start").on(t.cohortId, t.startAt),
    index("idx_events_subject").on(t.subjectId),
    index("idx_events_external_id").on(t.externalId),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    status: taskStatusEnum("status").notNull().default("todo"),
    priority: smallint("priority").notNull().default(0),
    estimatedMinutes: smallint("estimated_minutes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    // Critical index from §6.3
    index("idx_tasks_user_due").on(t.userId, t.dueAt),
    index("idx_tasks_subject").on(t.subjectId),
  ],
);

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    remindAt: timestamp("remind_at", { withTimezone: true }).notNull(),
    channel: reminderChannelEnum("channel").notNull().default("email"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_reminders_user").on(t.userId),
    index("idx_reminders_remind_at").on(t.remindAt),
    index("idx_reminders_task").on(t.taskId),
  ],
);

export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: integrationProviderEnum("provider").notNull(),
    // access_token/refresh_token stored encrypted — never plaintext
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    scopes: jsonb("scopes").$type<string[]>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_integrations_user_provider").on(t.userId, t.provider),
    index("idx_integrations_active").on(t.isActive),
  ],
);

// ─── Relations ───────────────────────────────────────────────────────────────

export const eventsRelations = relations(events, ({ one, many }) => ({
  subject: one(subjects, { fields: [events.subjectId], references: [subjects.id] }),
  cohort: one(cohorts, { fields: [events.cohortId], references: [cohorts.id] }),
  owner: one(users, { fields: [events.ownerUserId], references: [users.id] }),
  tasks: many(tasks),
  reminders: many(reminders),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, { fields: [tasks.userId], references: [users.id] }),
  subject: one(subjects, { fields: [tasks.subjectId], references: [subjects.id] }),
  event: one(events, { fields: [tasks.eventId], references: [events.id] }),
  reminders: many(reminders),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  task: one(tasks, { fields: [reminders.taskId], references: [tasks.id] }),
  event: one(events, { fields: [reminders.eventId], references: [events.id] }),
  user: one(users, { fields: [reminders.userId], references: [users.id] }),
}));

export const integrationsRelations = relations(integrations, ({ one }) => ({
  user: one(users, { fields: [integrations.userId], references: [users.id] }),
}));
