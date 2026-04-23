import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  smallint,
  boolean,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { cohorts, universities, users } from "./identity.js";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const subjectMemberRoleEnum = pgEnum("subject_member_role", [
  "student",
  "professor",
  "assistant",
]);

export const topicKindEnum = pgEnum("topic_kind", [
  "theory",
  "practice",
  "lab",
  "exam_unit",
]);

// ─── Tables ──────────────────────────────────────────────────────────────────

export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cohortId: uuid("cohort_id")
      .notNull()
      .references(() => cohorts.id, { onDelete: "cascade" }),
    universityId: uuid("university_id")
      .notNull()
      .references(() => universities.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    color: text("color"),
    credits: smallint("credits"),
    semester: smallint("semester"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("uq_subjects_cohort_code").on(t.cohortId, t.code),
    index("idx_subjects_cohort").on(t.cohortId),
    index("idx_subjects_university").on(t.universityId),
  ],
);

export const subjectMembers = pgTable(
  "subject_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: subjectMemberRoleEnum("role").notNull().default("student"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("uq_subject_members_subject_user").on(t.subjectId, t.userId),
    index("idx_subject_members_user").on(t.userId),
    index("idx_subject_members_subject").on(t.subjectId),
  ],
);

export const topics = pgTable(
  "topics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    parentTopicId: uuid("parent_topic_id"),
    orderIndex: integer("order_index").notNull().default(0),
    name: text("name").notNull(),
    kind: topicKindEnum("kind").notNull().default("theory"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_topics_subject").on(t.subjectId),
    index("idx_topics_parent").on(t.parentTopicId),
  ],
);

// ─── Relations ───────────────────────────────────────────────────────────────

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  cohort: one(cohorts, {
    fields: [subjects.cohortId],
    references: [cohorts.id],
  }),
  university: one(universities, {
    fields: [subjects.universityId],
    references: [universities.id],
  }),
  members: many(subjectMembers),
  topics: many(topics),
}));

export const subjectMembersRelations = relations(subjectMembers, ({ one }) => ({
  subject: one(subjects, {
    fields: [subjectMembers.subjectId],
    references: [subjects.id],
  }),
  user: one(users, {
    fields: [subjectMembers.userId],
    references: [users.id],
  }),
}));

export const topicsRelations = relations(topics, ({ one, many }) => ({
  subject: one(subjects, {
    fields: [topics.subjectId],
    references: [subjects.id],
  }),
  parent: one(topics, {
    fields: [topics.parentTopicId],
    references: [topics.id],
    relationName: "topic_hierarchy",
  }),
  children: many(topics, { relationName: "topic_hierarchy" }),
}));
