# 🗺️ Roadmap: TalentaBola

> **File ini = peta arah project.** Sumber tunggal visi + status + next up.
> Alur & invariant di [`konsep-ssb.md`](konsep-ssb.md), suara copy di [`brand.md`](brand.md), task detail di beads hub `~/Documents/applications` (epic `app-4r39`, label `tb`).
> Diperbarui: 2026-10-22 · Status: **Kode demo M1–M3 jadi; tinggal deploy produksi, uji di HP, dan paket demo untuk Mas Angga.**

---

## 🎯 MVP & Post-MVP

> **Definisi MVP dalam 1 kalimat yang bisa diverifikasi orang lain:** Coach Rizky bisa mengabsen 40 anak KU 2016 dari HP dalam < 2 menit (juga tanpa sinyal), menempel rekapnya ke grup WA, mengisi rapor satu anak < 2 menit, dan ortu membuka rapor itu dari link WA tanpa login.
> Aturan pilah: *"Apakah ini dipakai di demo Galuh Putra?"* → ya = MVP, tidak = Post-MVP.

### MVP — SEKARANG (jalur ke demo Coach Rizky)

| # | Item | Kenapa MVP | Status |
|---|---|---|---|
| ✅ | ~~M1.1 Scaffold Next.js 16 + Drizzle + Postgres~~ | Fondasi — **DONE** 22 Okt (kode). | ✅ |
| ✅ | ~~M1.2 Skema + CRUD pemain (validasi BMI)~~ | Data siswa wajib rapi sebelum ke ortu — **DONE**. | ✅ |
| ✅ | ~~M1.3 Impor anak KU 2016 dari daftar WA~~ | Coach tidak input dari nol — **DONE** (`/pemain/impor` + seed). | ✅ |
| ✅ | ~~M2.1 Presensi 1-tap + antrean offline~~ | Dipakai tiap latihan — **DONE**, E2E mode pesawat hijau. | ✅ |
| ✅ | ~~M2.2 Rekap WA satu tap~~ | Nilai terasa di sesi pertama — **DONE**. | ✅ |
| ✅ | ~~M3.1 Form rapor 22 aspek, satu anak satu layar~~ | Coach antusias ke rapor — **DONE**. | ✅ |
| ✅ | ~~M3.2 Rapor ortu + share WA~~ | Dokumen kebanggaan ortu — **DONE** (`/r/<token>`). | ✅ |
| 1 | **Deploy produksi (Vercel sin1 + Postgres)** | Demo harus jalan di HP coach | 🔄 lihat Next Up |
| 2 | M2.3 Uji sendiri: 40 anak di HP < 2 menit | Ukuran keberhasilan presensi | ⏳ butuh HP + URL produksi |
| 3 | M3.3 Paket demo: link + panduan Mas Angga | Penutup MVP | 🔄 panduan tertulis di `docs/panduan-demo.md`, tinggal link produksi |

### Post-MVP — NANTI (parkiran ide, bukan blocker)

| Item | Isi | Catatan |
|---|---|---|
| Login per pelatih | Supabase Auth, audit log per orang | Saat > 1 pelatih atau > 1 SSB |
| Multi-SSB | `ssb_id` dari sesi, bukan baris pertama | Kolom sudah ada di semua tabel |
| SPP & buku kas | Checklist iuran bulanan | Tunggu pengurus minta sendiri |
| Notifikasi WA otomatis | Fonnte/WA API | Ada biaya jalan |
| Filanesia penuh, radar chart | Rubrik per fase umur | Struktur `report_scores` sudah siap |
| Papan taktik 2D | Port dari `mockups/papan-taktik.html` | Wow-factor, bukan pain point |
| PDF rapor sungguhan | Sekarang cukup "Simpan PDF" lewat print | Kalau ortu minta file |
| Foto ke object storage | Sekarang data URL ±30 KB di DB | Saat pemain ratusan |

---

## 📅 Timeline

| Tanggal | Fase | Catatan |
|---|---|---|
| 2026-09-21 | Mockup | 10 layar HTML statis (sekarang di `mockups/`) |
| 2026-10-22 | M1–M3 kode | Satu malam: scaffold, pemain, presensi offline, rapor, halaman ortu; 29 unit test + 4 E2E hijau |

## 🎯 Visi

Aplikasi SSB pertama yang dipakai klub nyata, dan pintu SaaS untuk SSB lain. Pelatih menang duluan (presensi + rekap WA menggantikan kerja yang sudah ada), ortu terkesan lewat rapor yang terasa milik klub, pengurus melihat data pemain rapi — baru setelah itu bicara harga.

---

## 📊 Status

Legenda: ✅ jadi · 🔄 sebagian · ⏳ belum jalan

| Item | Status | Route | Catatan |
|---|---|---|---|
| Masuk pelatih (kode akses) | ✅ | `/masuk` | Satu kode bersama |
| Beranda | ✅ | `/` | Sesi hari ini, kehadiran 30 hari, rapor terbit |
| Pemain + impor WA | ✅ | `/pemain`, `/pemain/impor` | Validasi BMI server & klien |
| Presensi | ✅ | `/presensi`, `/presensi/[id]` | Offline queue, jadwal rutin, libur, rekap WA |
| Izin ortu | ✅ | `/ortu/[token]` | Aturan konflik di `lib/attendance.ts` |
| Rapor pelatih | ✅ | `/rapor/...` | Bintang default 3, bank kalimat, simpan otomatis |
| Rapor publik | ✅ | `/r/[token]` | Share WA + Simpan PDF |
| Pengaturan klub | ✅ | `/pengaturan` | Logo, warna klub, KU |
| Produksi | ⏳ | — | Lihat Next Up |

**Ringkasan:** semua fitur demo jadi dan teruji lokal; yang belum hanya hal yang butuh akun/HP Abu.

---

## 🚧 Next Up

Urutan saran: produksi dulu (semua langkah lain butuh URL), lalu uji di HP, lalu serahkan.

### 🔴 P1 — Critical

1. **Database produksi** — pilih: Supabase project baru (slot free tier penuh di akun utama) atau Postgres lain; isi `.env.production`, `ENV_FILE=.env.production pnpm db:migrate && pnpm db:seed`.
2. **Deploy Vercel** — env `DATABASE_URL`, `COACH_ACCESS_CODE`, `AUTH_SECRET`; cek `x-vercel-id` = `sin1`.

### 🟡 P2

3. M2.3 uji 40 anak di HP (target < 2 menit, coba mode pesawat).
4. M3.3 kirim link + `docs/panduan-demo.md` ke Mas Angga; isi 5–10 rapor contoh dulu.

---

## 📜 Changelog

- **2026-10-22** — Roadmap dibuat; M1.1–M3.2 selesai di kode.
