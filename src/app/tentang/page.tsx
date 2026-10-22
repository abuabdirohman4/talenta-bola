import { Check, ClipboardCheck, FileText, MessageSquareOff, Minus, Share2, Shuffle, UserRoundX, Users, WifiOff } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { Cta, waHref } from "./_components/Cta";
import { Phone } from "./_components/Phone";
import { Pitch } from "./_components/Pitch";

const PROMISE = "Presensi lapangan satu tap dan rapor perkembangan pemain untuk Sekolah Sepak Bola.";

// Halaman produk, bukan data klub: boleh diindeks (root layout menutup semua halaman lain karena data anak).
export const metadata: Metadata = {
  title: { absolute: "TalentaBola · Presensi satu tap & rapor pemain untuk SSB" },
  description: PROMISE,
  robots: { index: true, follow: true },
  openGraph: { title: "TalentaBola", description: PROMISE, type: "website", locale: "id_ID", siteName: "TalentaBola" },
};

const wrap = "mx-auto w-full max-w-6xl px-4 sm:px-6";
const section = "scroll-mt-20 py-14 md:py-24";
const h2 = "text-[1.65rem] leading-tight font-extrabold tracking-tight md:text-4xl";
const card = "rounded-2xl border border-line bg-card shadow-sm";

const PROBLEMS = [
  { icon: Users, title: "Daftar diisi ramai-ramai", body: "Tiap pelatih dan orang tua menyalin dan menambah daftar yang sama. Mana versi terbaru?" },
  { icon: Shuffle, title: "Notasi campur aduk", body: "Ada yang menulis ✅, ada “hadir”, ada “izin ya coach”. Merekap akhir bulan jadi kerja tangan." },
  { icon: UserRoundX, title: "Orang tua tak melihat perkembangan", body: "Yang sampai ke mereka cuma daftar hadir. Gambaran perkembangan anak tidak pernah ada." },
];

const PILLARS = [
  {
    id: "presensi",
    eyebrow: "Presensi lapangan",
    title: "Presensi 40 anak, beres sebelum pemanasan.",
    body: "Satu tap per anak: Hadir, Izin, Sakit, atau Alpa. Tombolnya besar, cukup untuk satu tangan di pinggir lapangan.",
    points: [
      "Tap tetap tercatat saat sinyal putus — statusnya jujur: “3 di HP, menunggu sinyal”",
      "Status dibedakan warna, ikon, dan huruf, bukan merah-hijau saja",
      "Rekap siap disalin ke grup WA dalam satu tap",
    ],
    shots: [
      { src: "/landing/presensi-tap.webp", alt: "Daftar pemain dengan tombol Hadir, Izin, Sakit, Alpa per anak" },
      { src: "/landing/presensi-rekap.webp", alt: "Rekap kehadiran sesi latihan dengan tombol Salin rekap" },
    ],
  },
  {
    id: "rapor",
    eyebrow: "Rapor perkembangan",
    title: "Rapor yang terasa dokumen resmi klub.",
    body: "22 aspek dinilai bintang 1–5, dilengkapi evaluasi naratif pelatih yang paling menonjol. Kop dan warna memakai identitas klub Anda.",
    points: [
      "Diterbitkan per anak, ketika pelatih siap",
      "Simpan sebagai PDF atau bagikan ke WA orang tua",
      "Kehadiran di rapor dihitung otomatis dari presensi",
    ],
    shots: [{ src: "/landing/rapor.webp", alt: "Rapor perkembangan pemain dengan kop klub, disiplin presensi, dan nilai rata-rata" }],
  },
  {
    id: "ortu",
    eyebrow: "Link orang tua",
    title: "Orang tua tenang, tanpa chat yang menumpuk.",
    body: "Setiap anak punya satu link pribadi. Orang tua cukup membukanya — tanpa login, tanpa pasang aplikasi.",
    points: [
      "Lihat jadwal latihan, kehadiran, dan rapor yang sudah terbit",
      "Kirim izin atau sakit sendiri; masuk ke lembar presensi pelatih",
      "Izin orang tua tidak menimpa input pelatih — pelatih yang memutuskan",
    ],
    shots: [{ src: "/landing/ortu.webp", alt: "Halaman orang tua dengan kartu anak, jadwal latihan, dan formulir izin" }],
  },
];

// "—" = tidak ada klaim: aplikasi SSB lain berbeda-beda, jadi hanya dua baris pertama yang dibandingkan.
const ROWS: [string, string, string, string][] = [
  ["Dibuat untuk", "HP di pinggir lapangan", "Chat grup", "Dashboard admin"],
  ["Dipakai di", "Lapangan, satu tangan", "Di grup, mengetik manual", "Di meja"],
  ["Rekap presensi", "Rapi dalam satu tap", "Disusun sendiri dari chat", "—"],
  ["Izin orang tua", "Orang tua izin sendiri lewat link", "Tenggelam di antara chat lain", "—"],
  ["Rapor", "Dokumen resmi klub, PDF & WA", "Tidak ada gambaran perkembangan", "—"],
];

const STEPS = [
  { icon: Users, title: "Masukkan data pemain", body: "Tempel daftar pemain dari WA, lalu tinggi dan berat badan divalidasi otomatis supaya tak ada angka janggal." },
  { icon: ClipboardCheck, title: "Presensi di lapangan", body: "Buka sesi hari ini, tap status tiap anak. Selesai, salin rekap ke grup." },
  { icon: Share2, title: "Bagikan link orang tua", body: "Kirim link pribadi tiap anak lewat WA. Jadwal, kehadiran, dan rapor ada di sana." },
];

export default function TentangPage() {
  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="sticky top-0 z-40 border-b border-line bg-ground/80 backdrop-blur">
        <div className={cn(wrap, "flex h-16 items-center gap-3")}>
          <Link href="/" className="mr-auto flex items-center gap-2.5" aria-label="TalentaBola">
            <Image src="/icon.png" alt="" width={36} height={36} className="size-9 rounded-xl shadow-md shadow-primary/25" />
            <span className="text-lg font-black tracking-tight">TalentaBola</span>
          </Link>
          <nav className="hidden items-center gap-1 text-sm font-semibold text-muted md:flex">
            {[["#fitur", "Fitur"], ["#beda", "Bedanya"], ["#mulai", "Cara mulai"]].map(([href, label]) => (
              <a key={href} href={href} className="rounded-lg px-3 py-2 hover:bg-card hover:text-ink">
                {label}
              </a>
            ))}
          </nav>
          <Link href="/masuk" className="rounded-full border border-line bg-card px-4 py-2 text-sm font-bold shadow-sm hover:bg-subtle">
            Masuk pelatih
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-linear-to-b from-primary-soft to-ground">
          <div className={cn(wrap, "grid items-center gap-10 pt-12 pb-14 md:pt-20 md:pb-24 lg:grid-cols-[1.15fr_1fr]")}>
            <div className="text-center lg:text-left">
              <p className="eyebrow inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1.5 shadow-sm">
                <span className="size-2 rounded-full bg-brand" aria-hidden />
                Untuk pelatih & pengelola SSB
              </p>
              <h1 className="mt-5 text-[2.1rem] leading-[1.1] font-extrabold tracking-tight text-balance md:text-5xl lg:text-[3.4rem]">
                Latihan tercatat, <span className="text-brand">perkembangan terlihat</span>, orang tua tenang.
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-base text-muted md:text-lg lg:mx-0">{PROMISE}</p>
              <Cta className="mt-8 justify-center lg:justify-start" />
              <ul className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-semibold text-muted lg:justify-start">
                {["Jalan tanpa sinyal", "Orang tua tanpa login", "Rapor PDF & WA"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Check size={16} className="text-primary" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative mx-auto w-full max-w-sm">
              <Pitch className="absolute top-1/2 left-1/2 w-[135%] max-w-none -translate-x-1/2 -translate-y-1/2 text-primary opacity-[0.14]" />
              <Phone src="/landing/presensi-tap.webp" alt="Aplikasi TalentaBola: presensi satu tap per anak" priority className="relative max-w-[270px]" />
            </div>
          </div>
        </section>

        {/* Masalah */}
        <section className={section}>
          <div className={wrap}>
            <p className="eyebrow">Hari ini</p>
            <h2 className={cn(h2, "mt-2 max-w-2xl text-balance")}>Presensi lewat grup WA itu melelahkan.</h2>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {PROBLEMS.map(({ icon: Icon, title, body }) => (
                <div key={title} className={cn(card, "p-6")}>
                  <span className="grid size-11 place-items-center rounded-xl bg-alpa/10 text-alpa">
                    <Icon size={22} aria-hidden />
                  </span>
                  <h3 className="mt-4 text-lg font-extrabold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tiga pilar */}
        <section id="fitur" className={cn(section, "bg-card")}>
          <div className={cn(wrap, "space-y-20 md:space-y-28")}>
            {PILLARS.map((p, i) => (
              <div key={p.id} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                <div className={cn(i % 2 === 1 && "lg:order-2")}>
                  <p className="eyebrow text-primary! dark:text-primary-2!">{p.eyebrow}</p>
                  <h2 className={cn(h2, "mt-2 text-balance")}>{p.title}</h2>
                  <p className="mt-4 text-base leading-relaxed text-muted md:text-lg">{p.body}</p>
                  <ul className="mt-6 space-y-3">
                    {p.points.map((t) => (
                      <li key={t} className="flex gap-3 text-[15px]">
                        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand text-white">
                          <Check size={13} strokeWidth={3} aria-hidden />
                        </span>
                        {t}
                      </li>
                    ))}
                  </ul>
                  {p.id === "presensi" && (
                    <p className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary-soft px-3.5 py-2 text-sm font-semibold text-primary dark:text-primary-2">
                      <WifiOff size={16} aria-hidden /> Dipakai berdiri di lapangan, bukan di meja.
                    </p>
                  )}
                  {p.id === "rapor" && (
                    <p className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary-soft px-3.5 py-2 text-sm font-semibold text-primary dark:text-primary-2">
                      <FileText size={16} aria-hidden /> Tampil dengan identitas klub Anda, bukan merek kami.
                    </p>
                  )}
                </div>
                <div className="rounded-3xl bg-primary-soft px-4 py-10 md:py-12">
                  <div className="flex items-start justify-center gap-4">
                    {p.shots.map((s, k) => (
                      <Phone key={s.src} {...s} className={cn(p.shots.length > 1 && "max-w-[44%] sm:max-w-[210px]", k === 1 && "mt-10")} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Perbandingan */}
        <section id="beda" className={section}>
          <div className={wrap}>
            <p className="eyebrow">Bedanya</p>
            <h2 className={cn(h2, "mt-2 max-w-2xl text-balance")}>Dibuat untuk HP di pinggir lapangan, bukan dashboard admin.</h2>

            <div className={cn(card, "mt-10 hidden overflow-hidden md:block")}>
              <table className="w-full border-collapse text-left text-[15px]">
                <thead>
                  <tr className="border-b border-line bg-subtle">
                    <th className="p-4" />
                    <th className="bg-brand p-4 font-extrabold text-white">TalentaBola</th>
                    <th className="p-4 font-bold text-muted">Daftar di grup WA</th>
                    <th className="p-4 font-bold text-muted">Aplikasi SSB lain</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map(([label, ...cells]) => (
                    <tr key={label} className="border-b border-line last:border-0">
                      <th className="p-4 font-bold">{label}</th>
                      {cells.map((c, i) => (
                        <td key={i} className={cn("p-4", i === 0 ? "bg-primary-soft font-semibold text-primary dark:text-primary-2" : "text-muted")}>
                          {c === "—" ? <Minus size={16} aria-label="tidak dibandingkan" /> : c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 space-y-4 md:hidden">
              {ROWS.map(([label, tb, wa, other]) => (
                <div key={label} className={cn(card, "overflow-hidden")}>
                  <p className="eyebrow border-b border-line bg-subtle px-4 py-2.5">{label}</p>
                  <div className="space-y-3 p-4 text-sm">
                    <p className="rounded-lg bg-primary-soft px-3 py-2 font-semibold text-primary dark:text-primary-2">
                      <span className="eyebrow block text-primary! dark:text-primary-2!">TalentaBola</span>
                      {tb}
                    </p>
                    <p className="px-3 text-muted">
                      <span className="eyebrow block">Daftar di grup WA</span>
                      {wa}
                    </p>
                    {other !== "—" && (
                      <p className="px-3 text-muted">
                        <span className="eyebrow block">Aplikasi SSB lain</span>
                        {other}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted">
              <MessageSquareOff size={12} className="mr-1 inline" aria-hidden />
              Aplikasi SSB berbeda-beda, jadi kami hanya membandingkan hal yang pasti. TalentaBola belum mencakup SPP atau papan taktik.
            </p>
          </div>
        </section>

        {/* Cara mulai */}
        <section id="mulai" className={cn(section, "bg-card")}>
          <div className={wrap}>
            <p className="eyebrow">Cara mulai</p>
            <h2 className={cn(h2, "mt-2 max-w-2xl text-balance")}>Tiga langkah, tanpa pelatihan panjang.</h2>
            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="rounded-2xl border border-line bg-subtle p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-full bg-brand text-lg font-black text-white shadow-md shadow-primary/25">{i + 1}</span>
                    <Icon size={22} className="text-primary" aria-hidden />
                  </div>
                  <h3 className="mt-4 text-lg font-extrabold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* CTA akhir */}
        <section className={section}>
          <div className={wrap}>
            <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-hero to-hero-2 px-6 py-14 text-center text-white md:px-12 md:py-20">
              <span className="absolute -top-24 -right-16 size-80 rounded-full bg-primary-2/25 blur-3xl" aria-hidden />
              <Pitch className="absolute top-1/2 left-1/2 h-[170%] -translate-x-1/2 -translate-y-1/2 text-white opacity-[0.06]" />
              <div className="relative">
                <h2 className="mx-auto max-w-2xl text-[1.75rem] leading-tight font-extrabold tracking-tight text-balance md:text-4xl">
                  Siap membuat latihan SSB Anda lebih tertata?
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-white/75">Ceritakan SSB Anda, kami bantu menyiapkan data pemain dan mencobanya bersama.</p>
                <Cta onDark className="mt-8 justify-center" />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8 text-sm text-muted">
        <div className={cn(wrap, "flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left")}>
          <p>© 2026 TalentaBola · Latihan tercatat, perkembangan terlihat, orang tua tenang.</p>
          <p className="flex items-center gap-4 font-semibold">
            <Link href="/masuk" className="hover:text-ink">
              Masuk pelatih
            </Link>
            {waHref && (
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="hover:text-ink">
                Hubungi kami
              </a>
            )}
          </p>
        </div>
      </footer>
    </div>
  );
}
