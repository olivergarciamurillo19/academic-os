import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  customType,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { users } from "./identity.js";
import { subjects, topics } from "./academic.js";
import { resources } from "./materials.js";

// ─── pgvector custom type ─────────────────────────────────────────────────────
// Drizzle doesn't have native vector type; use customType until official support.
const vector = (name: string, dimensions: number) =>
  customType<{ data: number[]; driverData: string }>({
    dataType() {
      return `vector(${dimensions})`;
    },
    toDriver(value) {
      return `[${value.join(",")}]`;
    },
    fromDriver(value) {
      return (value as string)
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map(Number);
    },
  })(name);

// ─── Enums ───────────────────────────────────────────────────────────────────

export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
  "tool",
]);

// ─── Tables ──────────────────────────────────────────────────────────────────

export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id").references(() => topics.id, { onDelete: "set null" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    // content_tsv updated by trigger in DB for full-text search
    embedding: vector("embedding", 1536),
    tokenCount: integer("token_count"),
    pageFrom: integer("page_from"),
    pageTo: integer("page_to"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Critical HNSW index from §6.3 — created via raw SQL in migration
    index("idx_chunks_subject").on(t.subjectId),
    index("idx_chunks_document").on(t.documentId),
  ],
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Nueva conversación"),
    pinned: boolean("pinned").notNull().default(false),
    summary: jsonb("summary").$type<{
      keyTopics?: string[];
      openQuestions?: string[];
      level?: string;
      updatedAfterMessageId?: string;
    }>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_conversations_user_subject").on(t.userId, t.subjectId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    content: jsonb("content").notNull().$type<{ text: string } | { toolUse: unknown }>(),
    citations: jsonb("citations").$type<Array<{ chunkId: string; snippet: string }>>(),
    tokenUsage: jsonb("token_usage").$type<{ input: number; output: number }>(),
    model: text("model"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Critical index from §6.3
    index("idx_messages_conv").on(t.conversationId, t.createdAt),
  ],
);

export const generatedTests = pgTable(
  "generated_tests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id").references(() => topics.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    questions: jsonb("questions").notNull().$type<Array<{
      question: string;
      options: string[];
      correctIndex: number;
      explanation?: string;
    }>>(),
    sourceChunks: jsonb("source_chunks").$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_generated_tests_user_subject").on(t.userId, t.subjectId),
  ],
);

export const testAttempts = pgTable(
  "test_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    generatedTestId: uuid("generated_test_id")
      .notNull()
      .references(() => generatedTests.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    answers: jsonb("answers").notNull().$type<number[]>(),
    score: text("score"),
    feedback: jsonb("feedback").$type<Array<{ questionIndex: number; correct: boolean; explanation: string }>>(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_test_attempts_user").on(t.userId),
    index("idx_test_attempts_test").on(t.generatedTestId),
  ],
);

// ─── Relations ───────────────────────────────────────────────────────────────

export const chunksRelations = relations(chunks, ({ one }) => ({
  resource: one(resources, { fields: [chunks.documentId], references: [resources.id] }),
  subject: one(subjects, { fields: [chunks.subjectId], references: [subjects.id] }),
  topic: one(topics, { fields: [chunks.topicId], references: [topics.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  subject: one(subjects, { fields: [conversations.subjectId], references: [subjects.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
}));

export const generatedTestsRelations = relations(generatedTests, ({ one, many }) => ({
  user: one(users, { fields: [generatedTests.userId], references: [users.id] }),
  subject: one(subjects, { fields: [generatedTests.subjectId], references: [subjects.id] }),
  topic: one(topics, { fields: [generatedTests.topicId], references: [topics.id] }),
  attempts: many(testAttempts),
}));

export const testAttemptsRelations = relations(testAttempts, ({ one }) => ({
  test: one(generatedTests, { fields: [testAttempts.generatedTestId], references: [generatedTests.id] }),
  user: one(users, { fields: [testAttempts.userId], references: [users.id] }),
}));

// SQL helper for HNSW and GIN indexes — applied in migration raw SQL
export const AI_INDEXES_SQL = sql`
  CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON chunks USING hnsw (embedding vector_cosine_ops);
  CREATE INDEX IF NOT EXISTS idx_chunks_fts ON chunks USING gin(to_tsvector('spanish', content));
`;
