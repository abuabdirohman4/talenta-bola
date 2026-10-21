import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isCoach } from "@/lib/auth/require-user";
import { getSsb } from "@/lib/data";
import { initials } from "@/lib/format";
import { LoginForm } from "./_components/LoginForm";

export const metadata: Metadata = { title: "Masuk" };

export default async function MasukPage() {
  if (await isCoach()) redirect("/");
  const ssb = await getSsb();

  return (
    <main className="brand grid min-h-dvh lg:grid-cols-2" style={{ "--color-primary": ssb.primaryColor } as React.CSSProperties}>
      <section className="flex flex-col justify-center px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-xl bg-primary text-lg font-extrabold text-white">
              {initials(ssb.name)}
            </span>
            <div>
              <p className="text-lg font-bold leading-tight">{ssb.name}</p>
              <p className="text-sm text-muted">Ruang pelatih</p>
            </div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Masuk untuk mulai presensi</h1>
          <p className="mt-2 text-[15px] text-muted">Masukkan kode akses pelatih. Sekali masuk, HP ini diingat 30 hari.</p>
          <LoginForm />
        </div>
      </section>
      <aside className="relative hidden overflow-hidden bg-primary lg:block" aria-hidden>
        {/* Garis lapangan sederhana sebagai panel brand. */}
        <svg viewBox="0 0 400 600" className="absolute inset-0 h-full w-full opacity-25" preserveAspectRatio="xMidYMid slice">
          <g fill="none" stroke="white" strokeWidth="3">
            <rect x="30" y="30" width="340" height="540" />
            <line x1="30" y1="300" x2="370" y2="300" />
            <circle cx="200" cy="300" r="60" />
            <rect x="110" y="30" width="180" height="90" />
            <rect x="110" y="480" width="180" height="90" />
          </g>
        </svg>
        <div className="absolute inset-x-12 bottom-14 text-white">
          <p className="text-3xl font-extrabold leading-tight">Absen 40 anak di bawah dua menit.</p>
          <p className="mt-3 text-white/80">Satu tap per anak, rekap langsung siap ditempel ke grup WA wali murid.</p>
        </div>
      </aside>
    </main>
  );
}
