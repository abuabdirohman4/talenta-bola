-- App hanya mengakses DB lewat Drizzle (DATABASE_URL, role pemilik tabel) — tidak ada supabase-js.
-- Jadi semua tabel dikunci dari Data API Supabase: RLS aktif TANPA policy (anon & authenticated tidak bisa apa-apa),
-- plus REVOKE eksplisit. Pemilik tabel (role migrasi) menembus RLS, jadi Drizzle tidak terdampak.
-- Blok DO supaya migrasi yang sama jalan di Postgres lokal (tanpa role anon/authenticated).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ssb_profiles','age_groups','players','training_sessions','attendances',
                           'parent_permissions','report_periods','reports','report_scores','audit_log'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated';
  END IF;
END $$;
