CREATE TYPE "public"."document_status" AS ENUM('pending', 'processing', 'indexed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."resource_kind" AS ENUM('pdf', 'image', 'text_note', 'audio', 'url');--> statement-breakpoint
CREATE TYPE "public"."resource_scope" AS ENUM('personal', 'subject_shared', 'cohort_shared');--> statement-breakpoint
CREATE TYPE "public"."resource_source" AS ENUM('user_upload', 'ical_import', 'blackboard_sync', 'manual');--> statement-breakpoint
CREATE TYPE "public"."event_kind" AS ENUM('class', 'exam', 'deadline', 'study_session', 'personal');--> statement-breakpoint
CREATE TYPE "public"."event_source" AS ENUM('manual', 'ical', 'google_calendar', 'blackboard');--> statement-breakpoint
CREATE TYPE "public"."integration_provider" AS ENUM('google_calendar', 'ical_url', 'blackboard_ext');--> statement-breakpoint
CREATE TYPE "public"."reminder_channel" AS ENUM('email', 'push', 'inapp');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('todo', 'doing', 'done', 'archived');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'system', 'tool');--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"status" "document_status" DEFAULT 'pending' NOT NULL,
	"pages" integer,
	"text_extracted" boolean DEFAULT false NOT NULL,
	"language" text,
	"processing_error" text,
	"indexed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documents_resource_id_unique" UNIQUE("resource_id")
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"topic_id" uuid,
	"owner_user_id" uuid NOT NULL,
	"kind" "resource_kind" NOT NULL,
	"title" text NOT NULL,
	"source" "resource_source" DEFAULT 'user_upload' NOT NULL,
	"storage_path" text,
	"mime_type" text,
	"bytes" bigint,
	"scope" "resource_scope" DEFAULT 'personal' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid,
	"cohort_id" uuid,
	"owner_user_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone,
	"location" text,
	"kind" "event_kind" DEFAULT 'personal' NOT NULL,
	"source" "event_source" DEFAULT 'manual' NOT NULL,
	"external_id" text,
	"color" text,
	"is_all_day" boolean DEFAULT false NOT NULL,
	"is_official" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"expires_at" timestamp with time zone,
	"scopes" jsonb,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid,
	"event_id" uuid,
	"user_id" uuid NOT NULL,
	"remind_at" timestamp with time zone NOT NULL,
	"channel" "reminder_channel" DEFAULT 'email' NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subject_id" uuid,
	"event_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"due_at" timestamp with time zone,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"priority" smallint DEFAULT 0 NOT NULL,
	"estimated_minutes" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"topic_id" uuid,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"token_count" integer,
	"page_from" integer,
	"page_to" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"title" text DEFAULT 'Nueva conversación' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"topic_id" uuid,
	"title" text NOT NULL,
	"questions" jsonb NOT NULL,
	"source_chunks" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" jsonb NOT NULL,
	"citations" jsonb,
	"token_usage" jsonb,
	"model" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generated_test_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"answers" jsonb NOT NULL,
	"score" text,
	"feedback" jsonb,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_document_id_resources_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_tests" ADD CONSTRAINT "generated_tests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_tests" ADD CONSTRAINT "generated_tests_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_tests" ADD CONSTRAINT "generated_tests_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_generated_test_id_generated_tests_id_fk" FOREIGN KEY ("generated_test_id") REFERENCES "public"."generated_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_documents_resource" ON "documents" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "idx_documents_status" ON "documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_resources_subject_topic" ON "resources" USING btree ("subject_id","topic_id");--> statement-breakpoint
CREATE INDEX "idx_resources_owner" ON "resources" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "idx_resources_subject" ON "resources" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "idx_events_owner_start" ON "events" USING btree ("owner_user_id","start_at");--> statement-breakpoint
CREATE INDEX "idx_events_cohort_start" ON "events" USING btree ("cohort_id","start_at");--> statement-breakpoint
CREATE INDEX "idx_events_subject" ON "events" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "idx_events_external_id" ON "events" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "idx_integrations_user_provider" ON "integrations" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "idx_integrations_active" ON "integrations" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_reminders_user" ON "reminders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_reminders_remind_at" ON "reminders" USING btree ("remind_at");--> statement-breakpoint
CREATE INDEX "idx_reminders_task" ON "reminders" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_user_due" ON "tasks" USING btree ("user_id","due_at");--> statement-breakpoint
CREATE INDEX "idx_tasks_subject" ON "tasks" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "idx_chunks_subject" ON "chunks" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "idx_chunks_document" ON "chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_conversations_user_subject" ON "conversations" USING btree ("user_id","subject_id");--> statement-breakpoint
CREATE INDEX "idx_generated_tests_user_subject" ON "generated_tests" USING btree ("user_id","subject_id");--> statement-breakpoint
CREATE INDEX "idx_messages_conv" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_test_attempts_user" ON "test_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_test_attempts_test" ON "test_attempts" USING btree ("generated_test_id");