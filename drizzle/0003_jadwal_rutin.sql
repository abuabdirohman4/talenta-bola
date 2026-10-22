CREATE TABLE "training_patterns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ssb_id" uuid NOT NULL,
	"age_group_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"start_time" time NOT NULL,
	"location" text,
	"topic" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "training_sessions" ADD COLUMN "cancel_reason" text;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD COLUMN "pattern_id" uuid;--> statement-breakpoint
ALTER TABLE "training_patterns" ADD CONSTRAINT "training_patterns_ssb_id_ssb_profiles_id_fk" FOREIGN KEY ("ssb_id") REFERENCES "public"."ssb_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_patterns" ADD CONSTRAINT "training_patterns_age_group_id_age_groups_id_fk" FOREIGN KEY ("age_group_id") REFERENCES "public"."age_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "training_patterns_group_weekday_active_unique" ON "training_patterns" USING btree ("age_group_id","weekday") WHERE "training_patterns"."deleted_at" is null;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_pattern_id_training_patterns_id_fk" FOREIGN KEY ("pattern_id") REFERENCES "public"."training_patterns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Tabel baru ikut pola 0001: RLS aktif tanpa policy, tertutup dari Data API Supabase.
ALTER TABLE "training_patterns" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON public.training_patterns FROM anon, authenticated';
  END IF;
END $$;
