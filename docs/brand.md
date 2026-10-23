# Brand — TalentaBola

> Satu halaman identitas produk. Dibaca SEBELUM menulis copy UI, LP, atau konten promo.
> Pasangan teknisnya: token warna di `src/app/globals.css` (`@theme`) dan komponen di `src/components/ui/`.
> Tag: **Must** = wajib dipatuhi, **Should** = default yang boleh menyimpang dengan alasan.

## 1. Posisi · Must

- **Untuk siapa:** pelatih SSB usia dini (KU 8–16) yang hari ini mengabsen dan mengabari wali murid lewat grup WA.
- **Masalah yang diselesaikan:** daftar presensi di grup WA diisi ramai-ramai, notasinya campur aduk, dan ortu tidak pernah dapat gambaran perkembangan anaknya.
- **Janji satu kalimat (hero LP):** Presensi lapangan satu tap dan rapor perkembangan pemain untuk Sekolah Sepak Bola.
- **Tagline (login, LP, konten):** Latihan tercatat, perkembangan terlihat, orang tua tenang. — sengaja tidak menyebut presensi saja; produk mencakup rapor, link ortu, dan nanti kurikulum. Turunan per fitur boleh spesifik (mis. presensi: "Presensi 40 anak, beres sebelum pemanasan.").
- **Beda dari alternatif:** dibanding daftar WA — rekapnya rapi dalam satu tap, ortu izin sendiri tanpa chat tenggelam, dan rapor terasa dokumen resmi klub. Dibanding app SSB lain — dibuat untuk HP di pinggir lapangan, bukan dashboard admin.
- **Bukan:** aplikasi keuangan/SPP, papan taktik, atau media sosial klub (belum).

## 1a. Akun resmi

- Instagram: [@talenta.bola](https://www.instagram.com/talenta.bola/)
- Email: halotalentabola@gmail.com
- App/LP: https://talenta-bola.vercel.app (tamu otomatis lihat LP)

## 2. Kepribadian

| Sifat | Bukan |
|---|---|
| sigap — sekali tap beres | ribet, banyak konfirmasi |
| hangat ke ortu | kaku/birokratis |
| bangga pada klub | menonjolkan merek penyedia |

## 3. Suara copy · Must

- **Sapaan:** tanpa sapaan di app pelatih; "Ayah/Bunda" di pesan WA ke ortu.
- **Bahasa:** Indonesia sehari-hari; istilah sepak bola yang lazim boleh Inggris (passing, first touch, 1 vs 1).
- **Tombol:** kata kerja + objek (`Mulai presensi hari ini`, `Terbitkan rapor`, `Kirim ke WA ortu`).
- **Error:** apa yang terjadi + langkah berikutnya (`Gagal kirim — coba lagi`, `Link sudah tidak berlaku. Minta link baru ke pelatih.`).
- **Kosong:** ajak aksi pertama (`Belum ada sesi. Tekan Mulai presensi hari ini…`).
- **Offline:** jujur (`3 di HP, menunggu sinyal`), jangan diam-diam.

| Sering dipakai | Dilarang |
|---|---|
| presensi, sesi, rapor, izin, sakit, KU, pemain/anak | absen/absensi (pakai "presensi" — "absen" berarti tidak hadir), roster/siswa/database (pakai "pemain"/"anak"), submit, data error mentah |

## 4. Visual · Must

- **Warna utama:** `--color-primary` emerald `#059669` di atas latar slate `#F1F5F9`, mengikuti `mockups/*.html` — aksi utama. Kartu sorotan (sesi berikutnya, kartu pemain di rapor) gelap. Bisa diganti warna klub.
- **Gradasi merek** (ala LP Better Planner): `bg-brand` (primary → primary-2, lebih terang) hanya untuk aksi utama, logo, dan bar progres; pendar hijau samar di kartu gelap. Latar luas tetap polos supaya data mudah dibaca.
- **Warna status:** Hadir `--color-hadir`, Izin `--color-izin`, Sakit `--color-sakit`, Alpa `--color-alpa`; selalu disertai ikon + huruf.
- **Huruf:** Plus Jakarta Sans lewat `next/font`; aksen serif hanya untuk nama anak & tanda tangan di rapor.
- **Ikon & logo:** lucide-react; ikon PWA bola di `public/icons/` (192/512/maskable), `src/app/icon.png`, `apple-icon.png`.
- **Mode gelap:** didukung — ikut setelan HP, bisa diganti lewat tombol bulan/matahari. Mode terang tetap kontras tinggi untuk lapangan siang hari; cetak/PDF selalu terang.

## 5. Konsistensi lintas permukaan · Should

| Permukaan | Wajib sama |
|---|---|
| App pelatih | nama klub di header, warna klub |
| Halaman ortu & rapor | kop klub, tanpa "Powered by" |
| Pesan WA (link ortu, rapor, rekap) | sapaan Ayah/Bunda, nama klub |
| PWA (manifest) | janji §1 sebagai `description` |

## 6. Do / Don't

| Do | Don't |
|---|---|
| Tombol status besar dengan huruf H/I/S/A | Hanya warna merah-hijau |
| Evaluasi naratif pelatih paling menonjol di rapor | Tabel angka telanjang 1–100 |
| Validasi tinggi/berat yang masuk akal | Membiarkan "144 cm / 12 kg" sampai ke ortu |

## 7. QA sebelum rilis · Must

- [ ] Teks baru mengikuti §3.
- [ ] Tidak ada warna hex liar di komponen — pakai token.
- [ ] `manifest.ts` dan `metadata.description` memakai janji §1.
