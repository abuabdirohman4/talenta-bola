import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isCoach } from "@/lib/auth/require-user";
import { getSsb } from "@/lib/data";
import { ThemeToggle } from "@/components/ThemeToggle";
import { clubInitials } from "@/lib/format";
import { LoginForm } from "./_components/LoginForm";

export const metadata: Metadata = { title: "Masuk" };

// Formasi 1-2-3-1 (Filanesia KU-10): [x, y, nomor punggung].
const LINEUP: [number, number, number][] = [
  [200, 525, 1],
  [125, 425, 4],
  [275, 425, 5],
  [85, 305, 7],
  [200, 330, 10],
  [315, 305, 11],
  [200, 205, 9],
];
const LINKS: [number, number][] = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5], [4, 6], [3, 6], [5, 6]];

export default async function MasukPage() {
  if (await isCoach()) redirect("/");
  const ssb = await getSsb();

  return (
    <main className="brand grid min-h-dvh lg:grid-cols-2" style={{ "--color-primary": ssb.primaryColor } as React.CSSProperties}>
      <section className="relative flex flex-col justify-center px-4 py-10 sm:px-12">
        <ThemeToggle className="absolute top-4 right-4" />
        <div className="mx-auto w-full max-w-sm rounded-2xl border border-line bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-xl bg-linear-to-br from-primary to-primary-2 text-lg font-extrabold text-white shadow-md shadow-primary/25">
              {clubInitials(ssb.name)}
            </span>
            <div>
              <p className="text-base leading-tight font-black tracking-tight">{ssb.name}</p>
              <p className="eyebrow">Ruang pelatih</p>
            </div>
          </div>
          <h1 className="text-xl font-black tracking-tight">Masuk untuk mulai presensi</h1>
          <p className="mt-2 text-sm text-muted">Masukkan kode akses pelatih. Sekali masuk, HP ini diingat 30 hari.</p>
          <LoginForm />
        </div>
      </section>
      <aside className="relative hidden overflow-hidden bg-linear-to-br from-primary to-primary-dark lg:block dark:from-primary-dark dark:via-hero-2 dark:to-hero" aria-hidden>
        <span className="absolute -top-32 -right-24 size-96 rounded-full bg-primary-2/40 blur-3xl" />
        {/* Lapangan + formasi 7v7 (1-2-3-1) ala papan line up; nomor saja, tanpa nama anak. */}
        <svg viewBox="0 0 400 600" className="absolute inset-x-0 top-36 bottom-6 h-[calc(100%-10.5rem)] w-full" preserveAspectRatio="xMidYMid meet">
          <g fill="none" stroke="white" strokeOpacity="0.22" strokeWidth="3">
            <rect x="30" y="30" width="340" height="540" rx="6" />
            <line x1="30" y1="300" x2="370" y2="300" />
            <circle cx="200" cy="300" r="56" />
            <rect x="110" y="30" width="180" height="84" />
            <rect x="110" y="486" width="180" height="84" />
          </g>
          <g stroke="white" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="5 7" fill="none">
            {LINKS.map(([a, b]) => (
              <line key={`${a}-${b}`} x1={LINEUP[a]![0]} y1={LINEUP[a]![1]} x2={LINEUP[b]![0]} y2={LINEUP[b]![1]} />
            ))}
          </g>
          {LINEUP.map(([x, y, n]) => (
            <g key={n} transform={`translate(${x} ${y})`}>
              <ellipse cy="26" rx="20" ry="5" fill="black" fillOpacity="0.18" />
              <path
                d="M-14 -18 L-6 -22 Q0 -16 6 -22 L14 -18 L24 -8 L16 -1 L13 -5 L13 21 L-13 21 L-13 -5 L-16 -1 L-24 -8 Z"
                fill="white"
              />
              <text y="12" textAnchor="middle" className="fill-primary text-[17px] font-black">
                {n}
              </text>
            </g>
          ))}
        </svg>
        <div className="absolute inset-x-12 top-12 text-white">
          <p className="text-3xl leading-tight font-extrabold">Presensi 40 anak, beres sebelum pemanasan.</p>
          <p className="mt-3 text-white/80">Satu tap per anak, rekap langsung siap ditempel ke grup WA wali murid.</p>
        </div>
      </aside>
    </main>
  );
}
