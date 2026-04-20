CREATE TYPE "public"."degree_kind" AS ENUM('bachelor', 'master', 'phd', 'associate');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('student', 'delegate', 'admin');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('active', 'inactive', 'suspended', 'pending');--> statement-breakpoint
CREATE TYPE "public"."subject_member_role" AS ENUM('student', 'professor', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."topic_kind" AS ENUM('theory', 'practice', 'lab', 'exam_unit');--> statement-breakpoint
CREATE TABLE "cohorts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"degree_program_id" uuid NOT NULL,
	"academic_year" text NOT NULL,
	"period" text NOT NULL,
	"group_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_cohorts_program_year_period_group" UNIQUE("degree_program_id","academic_year","period","group_code")
);
--> statement-breakpoint
CREATE TABLE "degree_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"university_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"kind" "degree_kind" DEFAULT 'bachelor' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_degree_programs_university_code" UNIQUE("university_id","code")
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"university_id" uuid NOT NULL,
	"degree_program_id" uuid NOT NULL,
	"cohort_id" uuid NOT NULL,
	"role" "membership_role" DEFAULT 'student' NOT NULL,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_memberships_user_cohort" UNIQUE("user_id","cohort_id")
);
--> statement-breakpoint
CREATE TABLE "universities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"country" text NOT NULL,
	"locale" text DEFAULT 'es' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "universities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"avatar_url" text,
	"preferences" jsonb,
	"study_method" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "subject_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "subject_member_role" DEFAULT 'student' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_subject_members_subject_user" UNIQUE("subject_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cohort_id" uuid NOT NULL,
	"university_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"credits" smallint,
	"semester" smallint,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_subjects_cohort_code" UNIQUE("cohort_id","code")
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"parent_topic_id" uuid,
	"order_index" integer DEFAULT 0 NOT NULL,
	"name" text NOT NULL,
	"kind" "topic_kind" DEFAULT 'theory' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_degree_program_id_degree_programs_id_fk" FOREIGN KEY ("degree_program_id") REFERENCES "public"."degree_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "degree_programs" ADD CONSTRAINT "degree_programs_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_degree_program_id_degree_programs_id_fk" FOREIGN KEY ("degree_program_id") REFERENCES "public"."degree_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_members" ADD CONSTRAINT "subject_members_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_members" ADD CONSTRAINT "subject_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_cohorts_degree_program" ON "cohorts" USING btree ("degree_program_id");--> statement-breakpoint
CREATE INDEX "idx_degree_programs_university" ON "degree_programs" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX "idx_memberships_user" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_memberships_cohort" ON "memberships" USING btree ("cohort_id");--> statement-breakpoint
CREATE INDEX "idx_memberships_university" ON "memberships" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX "idx_subject_members_user" ON "subject_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_subject_members_subject" ON "subject_members" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "idx_subjects_cohort" ON "subjects" USING btree ("cohort_id");--> statement-breakpoint
CREATE INDEX "idx_subjects_university" ON "subjects" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX "idx_topics_subject" ON "topics" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "idx_topics_parent" ON "topics" USING btree ("parent_topic_id");