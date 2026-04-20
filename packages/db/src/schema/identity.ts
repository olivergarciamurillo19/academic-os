import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  jsonb,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const degreeKindEnum = pgEnum("degree_kind", [
  "bachelor",
  "master",
  "phd",
  "associate",
]);

export const membershipRoleEnum = pgEnum("membership_role", [
  "student",
  "delegate",
  "admin",
]);

export const membershipStatusEnum = pgEnum("membership_status", [
  "active",
  "inactive",
  "suspended",
  "pending",
]);

// ─── Tables ──────────────────────────────────────────────────────────────────

export const universities = pgTable("universities", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  locale: text("locale").notNull().default("es"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const degreePrograms = pgTable(
  "degree_programs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    universityId: uuid("university_id")
      .notNull()
      .references(() => universities.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    kind: degreeKindEnum("kind").notNull().default("bachelor"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("uq_degree_programs_university_code").on(t.universityId, t.code),
    index("idx_degree_programs_university").on(t.universityId),
  ],
);

export const cohorts = pgTable(
  "cohorts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    degreeProgramId: uuid("degree_program_id")
      .notNull()
      .references(() => degreePrograms.id, { onDelete: "cascade" }),
    academicYear: text("academic_year").notNull(),
    period: text("period").notNull(),
    groupCode: text("group_code").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("uq_cohorts_program_year_period_group").on(
      t.degreeProgramId,
      t.academicYear,
      t.period,
      t.groupCode,
    ),
    index("idx_cohorts_degree_program").on(t.degreeProgramId),
  ],
);

export const users = pgTable("users", {
  // id mirrors auth.uid() from Supabase Auth
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  preferences: jsonb("preferences").$type<Record<string, unknown>>(),
  studyMethod: jsonb("study_method").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    universityId: uuid("university_id")
      .notNull()
      .references(() => universities.id, { onDelete: "cascade" }),
    degreeProgramId: uuid("degree_program_id")
      .notNull()
      .references(() => degreePrograms.id, { onDelete: "cascade" }),
    cohortId: uuid("cohort_id")
      .notNull()
      .references(() => cohorts.id, { onDelete: "cascade" }),
    role: membershipRoleEnum("role").notNull().default("student"),
    status: membershipStatusEnum("status").notNull().default("active"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("uq_memberships_user_cohort").on(t.userId, t.cohortId),
    index("idx_memberships_user").on(t.userId),
    index("idx_memberships_cohort").on(t.cohortId),
    index("idx_memberships_university").on(t.universityId),
  ],
);

// ─── Relations ───────────────────────────────────────────────────────────────

export const universitiesRelations = relations(universities, ({ many }) => ({
  degreePrograms: many(degreePrograms),
  memberships: many(memberships),
}));

export const degreeProgramsRelations = relations(
  degreePrograms,
  ({ one, many }) => ({
    university: one(universities, {
      fields: [degreePrograms.universityId],
      references: [universities.id],
    }),
    cohorts: many(cohorts),
    memberships: many(memberships),
  }),
);

export const cohortsRelations = relations(cohorts, ({ one, many }) => ({
  degreeProgram: one(degreePrograms, {
    fields: [cohorts.degreeProgramId],
    references: [degreePrograms.id],
  }),
  memberships: many(memberships),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
  university: one(universities, {
    fields: [memberships.universityId],
    references: [universities.id],
  }),
  degreeProgram: one(degreePrograms, {
    fields: [memberships.degreeProgramId],
    references: [degreePrograms.id],
  }),
  cohort: one(cohorts, {
    fields: [memberships.cohortId],
    references: [cohorts.id],
  }),
}));
