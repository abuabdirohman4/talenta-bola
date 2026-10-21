# TalentaBola

Presensi lapangan satu tap dan rapor perkembangan pemain untuk Sekolah Sepak Bola. Dibangun pertama untuk SSB Galuh Putra Tasikmalaya (KU 2016).

- **Pelatih:** presensi 1-tap per anak (tetap jalan tanpa sinyal), rekap siap tempel ke grup WA, jadwal rutin, rapor 22 aspek bintang 1–5 dengan kalimat siap pakai.
- **Orang tua:** link khusus per anak tanpa login — lihat kehadiran, ajukan izin/sakit, baca rapor.
- **Rapor:** dokumen bergaya resmi klub, bisa dibagikan ke WA atau disimpan PDF.

## Menjalankan

```bash
cp .env.example .env.local   # isi DATABASE_URL, COACH_ACCESS_CODE, AUTH_SECRET
pnpm install
pnpm db:migrate && pnpm db:seed
pnpm dev                     # http://localhost:5113
```

Tes: `pnpm test:run` (unit + guard keamanan), `pnpm test:e2e` (Playwright, butuh DB ter-seed).

Dokumen: [`docs/konsep-ssb.md`](docs/konsep-ssb.md) · [`docs/roadmap.md`](docs/roadmap.md) · [`docs/panduan-demo.md`](docs/panduan-demo.md) · [`docs/brand.md`](docs/brand.md).
Mockup HTML awal: [`mockups/`](mockups/).
