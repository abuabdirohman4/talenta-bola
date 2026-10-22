ALTER TABLE "ssb_profiles" ALTER COLUMN "primary_color" SET DEFAULT '#059669';--> statement-breakpoint
-- Klub yang masih memakai warna bawaan lama ikut pindah ke emerald mockup; warna pilihan klub sendiri tidak disentuh.
UPDATE "ssb_profiles" SET "primary_color" = '#059669' WHERE lower("primary_color") = '#2f6b3f';
