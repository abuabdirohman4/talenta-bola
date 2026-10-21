# Konsep SSB — alur & invariant

Sumber keputusan: vault `4.Archives/applications/aplikasi-ssb/` (`brief_demo_talentabola.md`, `plan_mvp_ssb.md`, `design_talentabola.md`).

## Alur besar

```
Data siswa ──► Presensi lapangan ──► Rapor periode ──► Halaman ortu
 (impor WA,      (1 tap per anak,     (22 aspek bintang   (/ortu/<token>: kehadiran,
  validasi BMI)   antrean offline,     1-5 + naratif,      izin/sakit, daftar rapor;
                  rekap WA 1 tap)      terbit per anak)    /r/<token>: dokumen rapor)
       ▲                 ▲
       └── izin ortu ────┘  (masuk ke lembar presensi pelatih)
```

## Istilah

| Istilah | Arti |
|---|---|
| KU | Kelompok umur (`age_groups`), mis. "KU 2016" kode `KU-10` |
| Sesi | Satu latihan satu KU satu tanggal (`training_sessions`, unik per KU per tanggal) |
| Presensi | Status anak di satu sesi: Hadir / Izin / Sakit / Alpa; tanpa baris = Belum konfirmasi |
| Izin ortu | Pengajuan dari halaman ortu (`parent_permissions`), selalu disimpan sebagai riwayat |
| Periode rapor | Rentang tanggal penilaian per KU (`report_periods`) |
| Terbit | Rapor bisa dibuka ortu (`reports.published_at`) |

## Invariant (tidak boleh dilanggar kode)

1. **Input pelatih tidak pernah ditimpa diam-diam.** Izin ortu sebelum pelatih mengisi → langsung tampil sebagai status; sesudah → pengajuan Terima/Abaikan (`resolveStatus`).
2. **Izin hanya untuk sesi yang ada**, belum lewat, tidak libur, ≤ 30 hari ke depan. Izin ganda: yang terbaru dipakai, yang lama tetap tersimpan.
3. **Tap presensi tidak boleh hilang.** Setiap tap masuk antrean `localStorage` dulu, dikirim batch ke `POST /api/presensi`; server last-write-wins berdasarkan waktu tap di HP (`attendances.updated_at`).
4. **Skor rapor default 3** (Cukup) untuk aspek yang tidak disentuh; baris skor hanya ada untuk aspek yang diubah pelatih.
5. **Baris rapor lahir saat pelatih pertama kali mengubah sesuatu** — status "Belum dinilai" selalu jujur.
6. **Kehadiran di rapor** = Hadir ÷ sesi yang sudah berlangsung (tidak libur, tanggal ≤ hari ini) dalam periode.
7. **Validasi pemain**: tinggi 90–200 cm, berat 15–120 kg, BMI 10–35, nomor punggung 1–99, WA nomor HP Indonesia. Tahun lahir beda KU = peringatan, bukan blokir.
8. **"Hari ini" = tanggal WIB** (`dateWib()`), bukan tanggal server.

## Akses

| Siapa | Cara masuk | Bisa apa |
|---|---|---|
| Pelatih | Kode akses bersama (`COACH_ACCESS_CODE`) → cookie HMAC 30 hari | Semua halaman `(app)` |
| Ortu | Link `/ortu/<parent_token>` (acak 32 karakter, bisa dibuat ulang) | Lihat kehadiran anaknya, ajukan izin, buka rapor terbit |
| Keluarga | Link `/r/<public_token>` | Baca satu rapor terbit saja |

Semua halaman `noindex`. Data anak di bawah umur: jangan ada data asli di repo publik.
