import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./identity.js";
import { subjects, topics } from "./academic.js";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const resourceKindEnum = pgEnum("resource_kind", [
  "pdf",
  "image",
  "text_note",
  "audio",
  "url",
]);

export const resourceSourceEnum = pgEnum("resource_source", [
  "user_upload",
  "ical_import",
  "blackboard_sync",
  "manual",
]);

export const resourceScopeEnum = pgEnum("resource_scope", [
  "personal",
  "subject_shared",
  "cohort_shared",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "pending",
  "processing",
  "indexed",
  "failed",
]);

// ─── Tables ──────────────────────────────────────────────────────────────────

export const resources = pgTable(
  "resources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id").references(() => topics.id, { onDelete: "set null" }),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: resourceKindEnum("kind").notNull(),
    title: text("title").notNull(),
    source: resourceSourceEnum("source").notNull().default("user_upload"),
    storagePath: text("storage_path"),
    mimeType: text("mime_type"),
    bytes: bigint("bytes", { mode: "number" }),
    scope: resourceScopeEnum("scope").notNull().default("personal"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_resources_subject_topic").on(t.subjectId, t.topicId),
    index("idx_resources_owner").on(t.ownerUserId),
    index("idx_resources_subject").on(t.subjectId),
  ],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resourceId: uuid("resource_id")
      .notNull()
      .unique()
      .references(() => resources.id, { onDelete: "cascade" }),
    status: documentStatusEnum("status").notNull().default("pending"),
    pages: integer("pages"),
    textExtracted: boolean("text_extracted").notNull().default(false),
    language: text("language"),
    processingError: text("processing_error"),
    indexedAt: timestamp("indexed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_documents_resource").on(t.resourceId),
    index("idx_documents_status").on(t.status),
  ],
);

// ─── Relations ───────────────────────────────────────────────────────────────

export const resourcesRelations = relations(resources, ({ one }) => ({
  subject: one(subjects, { fields: [resources.subjectId], references: [subjects.id] }),
  topic: one(topics, { fields: [resources.topicId], references: [topics.id] }),
  owner: one(users, { fields: [resources.ownerUserId], references: [users.id] }),
  document: one(documents),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  resource: one(resources, { fields: [documents.resourceId], references: [resources.id] }),
}));
