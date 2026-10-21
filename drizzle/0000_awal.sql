CREATE TYPE "public"."attendance_status" AS ENUM('HADIR', 'IZIN', 'SAKIT', 'ALPA');--> statement-breakpoint
CREATE TYPE "public"."permission_type" AS ENUM('IZIN', 'SAKIT');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('SCHEDULED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "age_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ssb_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"birth_year" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "attendances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ssb_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"status" "attendance_status" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ssb_id" uuid,
	"action" text NOT NULL,
	"table_name" text NOT NULL,
	"record_id" uuid,
	"data_before" jsonb,
	"data_after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parent_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ssb_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"type" "permission_type" NOT NULL,
	"reason" text NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ssb_id" uuid NOT NULL,
	"age_group_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"nickname" text,
	"birth_date" date,
	"jersey_number" integer,
	"position" text,
	"preferred_foot" text,
	"height_cm" numeric(5, 1),
	"weight_kg" numeric(5, 1),
	"parent_name" text,
	"parent_phone_wa" text,
	"photo_url" text,
	"parent_token" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "report_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ssb_id" uuid NOT NULL,
	"age_group_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "report_scores" (
	"report_id" uuid NOT NULL,
	"aspect_key" text NOT NULL,
	"score" smallint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_scores_report_id_aspect_key_pk" PRIMARY KEY("report_id","aspect_key")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ssb_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"strengths" text DEFAULT '' NOT NULL,
	"improvements" text DEFAULT '' NOT NULL,
	"next_target" text DEFAULT '' NOT NULL,
	"home_training" text DEFAULT '' NOT NULL,
	"published_at" timestamp with time zone,
	"public_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ssb_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo_url" text,
	"primary_color" text DEFAULT '#2F6B3F' NOT NULL,
	"phone_wa" text,
	"home_ground" text,
	"head_coach_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "training_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ssb_id" uuid NOT NULL,
	"age_group_id" uuid NOT NULL,
	"session_date" date NOT NULL,
	"start_time" time DEFAULT '07:30' NOT NULL,
	"location" text,
	"topic" text,
	"status" "session_status" DEFAULT 'SCHEDULED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "age_groups" ADD CONSTRAINT "age_groups_ssb_id_ssb_profiles_id_fk" FOREIGN KEY ("ssb_id") REFERENCES "public"."ssb_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_ssb_id_ssb_profiles_id_fk" FOREIGN KEY ("ssb_id") REFERENCES "public"."ssb_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_session_id_training_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."training_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_ssb_id_ssb_profiles_id_fk" FOREIGN KEY ("ssb_id") REFERENCES "public"."ssb_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_permissions" ADD CONSTRAINT "parent_permissions_ssb_id_ssb_profiles_id_fk" FOREIGN KEY ("ssb_id") REFERENCES "public"."ssb_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_permissions" ADD CONSTRAINT "parent_permissions_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_permissions" ADD CONSTRAINT "parent_permissions_session_id_training_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."training_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_ssb_id_ssb_profiles_id_fk" FOREIGN KEY ("ssb_id") REFERENCES "public"."ssb_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_age_group_id_age_groups_id_fk" FOREIGN KEY ("age_group_id") REFERENCES "public"."age_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_periods" ADD CONSTRAINT "report_periods_ssb_id_ssb_profiles_id_fk" FOREIGN KEY ("ssb_id") REFERENCES "public"."ssb_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_periods" ADD CONSTRAINT "report_periods_age_group_id_age_groups_id_fk" FOREIGN KEY ("age_group_id") REFERENCES "public"."age_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_scores" ADD CONSTRAINT "report_scores_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_ssb_id_ssb_profiles_id_fk" FOREIGN KEY ("ssb_id") REFERENCES "public"."ssb_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_period_id_report_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."report_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_ssb_id_ssb_profiles_id_fk" FOREIGN KEY ("ssb_id") REFERENCES "public"."ssb_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_age_group_id_age_groups_id_fk" FOREIGN KEY ("age_group_id") REFERENCES "public"."age_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "age_groups_ssb_code_active_unique" ON "age_groups" USING btree ("ssb_id","code") WHERE "age_groups"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "attendances_session_player_unique" ON "attendances" USING btree ("session_id","player_id");--> statement-breakpoint
CREATE INDEX "parent_permissions_session_idx" ON "parent_permissions" USING btree ("session_id","player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "players_parent_token_unique" ON "players" USING btree ("parent_token");--> statement-breakpoint
CREATE INDEX "players_ssb_group_idx" ON "players" USING btree ("ssb_id","age_group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_period_player_unique" ON "reports" USING btree ("period_id","player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_public_token_unique" ON "reports" USING btree ("public_token");--> statement-breakpoint
CREATE UNIQUE INDEX "ssb_profiles_slug_active_unique" ON "ssb_profiles" USING btree ("slug") WHERE "ssb_profiles"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "training_sessions_group_date_active_unique" ON "training_sessions" USING btree ("age_group_id","session_date") WHERE "training_sessions"."deleted_at" is null;