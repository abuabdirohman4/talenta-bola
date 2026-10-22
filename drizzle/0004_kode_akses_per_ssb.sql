ALTER TABLE "ssb_profiles" ADD COLUMN "access_code_hash" text;--> statement-breakpoint
ALTER TABLE "ssb_profiles" ADD COLUMN "access_code_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "ssb_profiles_access_code_active_unique" ON "ssb_profiles" USING btree ("access_code_hash") WHERE "ssb_profiles"."deleted_at" is null;