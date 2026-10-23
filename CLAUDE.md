# TalentaBola — Operating Manual

Aplikasi manajemen SSB (Sekolah Sepak Bola): **presensi lapangan 1-tap**, **rapor perkembangan**, dan **link ortu tanpa login**.
Klien demo: SSB Galuh Putra Tasikmalaya, KU 2016 (40 anak). Epic beads `app-4r39` (label `tb`, beads di hub `~/Documents/applications`).

Baca dulu: `docs/konsep-ssb.md` (alur + invariant), `docs/brand.md` (suara copy), `docs/roadmap.md` (status).
Mockup HTML statis lama ada di `mockups/` — acuan rupa, bukan kode.

## Stack

Next.js 16 (App Router, `src/proxy.ts`) · React 19 · TS strict · Tailwind v4 · Drizzle ORM + `postgres` · sonner · lucide-react · pnpm.
Tanpa Supabase Auth / supabase-js: semua data lewat Drizzle (`DATABASE_URL`). Postgres apa pun (prod: Supabase pooler :6543).

```bash
pnpm dev            # :5113
pnpm test:run       # vitest (logika murni + guard.test.ts)
pnpm test:e2e       # Playwright, butuh DB lokal ter-seed + dev server
pnpm db:generate    # migrasi dari src/db/schema.ts → drizzle/
pnpm db:migrate     # terapkan ke DATABASE_URL (ENV_FILE=.env.production untuk prod)
pnpm db:seed        # SSB + KU 2016 + pemain; nama asli dari src/db/roster.local.txt (gitignored)
```

DB lokal (WSL): cluster Postgres 18 `gm` di :5417, database `talenta_bola`, role `talenta` (password di `.env.local`).

## Gaya tampilan

**Lembar presensi mengikuti pola tabel Generus Mandiri** (Nama | H | I | S | A, default Alpa, kartu ringkasan satu baris) — diputuskan Abu 23 Okt 2026 setelah versi kartu warna-warni terasa "kekanak-kanakan". Halaman lain: **mockup di `mockups/*.html` adalah acuan rupa yang mengikat** (diputuskan Abu 22 Okt 2026 setelah v1.0.0 menyimpang — issue `app-1xtg`). Halaman baru: buka mockup terkait dan bandingkan screenshot berdampingan.
- **Layout**: sidebar desktop (≥ md) berseksi + panel KU aktif + top bar (remah + judul dari tabel `TITLES` di `_components/Nav.tsx`), bottom-nav 5 item di HP. Shell di `src/app/(app)/layout.tsx`.
- **Rupa**: slate + emerald (`#059669`), latar `#F1F5F9`, kartu `rounded-2xl border-line shadow-sm`, label kapital kecil (utility `eyebrow`), kartu sorotan gelap (`from-hero`), Plus Jakarta Sans.
- **Dark mode**: kelas `.dark` di `<html>` (skrip di root layout; pilihan tersimpan, default ikut sistem) + `ThemeToggle`. Token berganti nilai sendiri, jadi komponen cukup memakai token — hindari `bg-white`/`slate-*` mentah. Cetak/PDF selalu terang.
- **Warna status presensi** dibedakan warna + ikon + huruf: Hadir hijau ✓, Izin oranye ✋, Sakit ungu +, Alpa merah bata ✕.
- Semua warna lewat token `@theme` di `globals.css`. Warna klub (`ssb_profiles.primary_color`) diterapkan lewat wrapper `.brand` + `--color-primary`.

## Aturan arsitektur

| Aturan | Kenapa |
|---|---|
| `requireUser()` di baris pertama **tiap** server action & route handler | `guard.test.ts` gagal kalau lupa. Pintu publik (masuk, izin ortu) terdaftar di set `PUBLIC` tes itu |
| Proxy hanya mengalihkan halaman ke `/masuk` | Bukan penjaga data (CVE-2025-29927) |
| KU aktif = `?ku=` di tautan, lalu cookie `tb_ku` (dipilih di header/sidebar, `setActiveKu`), lalu KU pertama — `getActiveGroup()` | Satu pilihan KU berlaku di semua halaman; jangan tambah chip KU per halaman |
| Notifikasi lewat `notifySsb()` (`src/lib/server/notify.ts`), tidak pernah throw | Kegagalan push tidak boleh menggagalkan aksi ortu/pelatih |
| SSB pelatih = `ssb_id` dari cookie sesi (`getSsb()`), dicek ulang ke DB: SSB terhapus atau `access_code_version` beda = keluar | Kode akses per SSB (`access_code_hash`); ganti kode = semua HP lain keluar. Jangan pernah ambil "SSB pertama" |
| `/admin` = super-admin, cookie `tb_admin` + `SUPER_ADMIN_CODE`, `requireAdmin()` di tiap action | Terpisah dari sesi pelatih; halaman admin hanya angka, tanpa data anak |
| Server Action **hanya untuk mutasi**; baca lewat RSC (page.tsx) | Server Action antre satu per satu |
| Presensi lewat `POST /api/presensi` (batch, idempoten, last-write-wins by waktu tap) | Antrean offline mengirim ulang; kiriman lama tidak boleh menimpa yang baru |
| `ssb_id` di semua tabel; query selalu filter `ssb_id` dari `getSsb()` | Tenancy flat, siap multi-SSB |
| Hapus = soft delete (`deleted_at`) + unique **parsial** `WHERE deleted_at IS NULL` | Hapus lalu buat ulang tidak crash |
| Tabel baru → RLS aktif tanpa policy + REVOKE anon/authenticated (pola `drizzle/0001_akses_tertutup.sql`) | Data API Supabase tertutup total; app tidak memakainya |
| Skor rapor = baris `report_scores(report_id, aspect_key, score)`; rubrik di `src/lib/rubric.ts` | Aspek bisa bertambah tanpa ubah tabel |
| Link ortu `/ortu/<parent_token>` ≠ link rapor `/r/<public_token>` | Link rapor boleh disebar keluarga tanpa memberi hak izin |

## Kesalahan yang pasti dibuat AI

| Kesalahan | Aturan |
|---|---|
| Menimpa input pelatih dengan izin ortu | Izin ortu setelah pelatih mengisi = **pengajuan** (`resolveStatus` di `lib/attendance.ts`), pelatih yang memutuskan |
| Validasi BMI hanya di klien | `validatePlayer` dipanggil di server juga (`pemain/actions.ts`) |
| `toISOString().slice(0,10)` untuk "hari ini" | Pakai `dateWib()` — server Vercel UTC, latihan pagi WIB jatuh ke tanggal kemarin |
| Kolom `date` diformat dengan zona lokal | `formatDateId()` membaca sebagai UTC, jangan geser |
| Komponen satu-halaman di `src/components/` | Colocate di `_components/` dalam folder route; `src/components/` hanya yang dipakai lintas halaman |
| `router.push` / tombol async tanpa tanda tunggu | `Button loading`, `useTransition` dengan `isPending` dipakai, `loading.tsx` per grup, `useLinkStatus` di nav |
| Modal ad-hoc | `ConfirmDialog` (native `<dialog>`) |
| Tombol presensi dikecilkan | Minimal 44×56 px; ini dipakai berdiri satu tangan di lapangan (mockup lebih kecil — ini satu-satunya penyimpangan sengaja) |
| Mendesain ulang rupa sendiri | Ikuti `mockups/*.html`; jangan karang palet/tata letak baru |
| "Powered by TalentaBola" di halaman ortu | Halaman ortu & rapor terasa milik klub |
| Data anak asli masuk repo | Repo publik. Daftar nama asli hanya di `src/db/roster.local.txt` (gitignored) |
| `pkill -f <pola>` di Bash tool | Pola ikut cocok dengan shell tool itu sendiri → shell mati (exit 144). Matikan pakai PID |

Standar UI lintas proyek: vault `3.Resources/programming/building-app/ui_conventions.md`.
