import { and, eq, isNull } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { trainingPatterns } from "@/db/schema";
import { getActiveGroup } from "@/lib/data";
import { cn } from "@/lib/utils";
import { PatternCard, PatternForm } from "./_components/JadwalForms";

export const metadata: Metadata = { title: "Jadwal rutin" };

const card = "rounded-2xl border border-line bg-card shadow-sm";

export default async function JadwalPage({ searchParams }: { searchParams: Promise<{ ku?: string }> }) {
  const { ssb, group } = await getActiveGroup((await searchParams).ku);
  if (!group) return <p className={cn(card, "border-dashed p-6 text-center")}>Belum ada kelompok umur. Tambahkan di Pengaturan.</p>;

  const patterns = await db
    .select()
    .from(trainingPatterns)
    .where(and(eq(trainingPatterns.ageGroupId, group.id), eq(trainingPatterns.ssbId, ssb.id), isNull(trainingPatterns.deletedAt)));
  // Senin dulu, Minggu terakhir — urutan minggu yang lazim di Indonesia.
  patterns.sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-extrabold tracking-tight md:hidden">Jadwal rutin {group.name}</h2>

      <section className={cn(card, "space-y-3 p-4 md:p-5")}>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-primary" aria-hidden />
            <h3 className="text-xs font-black tracking-wider uppercase">Jadwal rutin mingguan</h3>
          </div>
          <p className="text-[11px] font-medium text-muted">Sesi 4 minggu ke depan dibuat otomatis</p>
        </div>
        {patterns.length ? (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {patterns.map((p, i) => (
              <PatternCard
                key={p.id}
                tone={i % 2 ? "info" : "primary"}
                pattern={{ id: p.id, ageGroupId: group.id, weekday: p.weekday, startTime: p.startTime.slice(0, 5), location: p.location ?? "", topic: p.topic ?? "" }}
              />
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">
            Belum ada jadwal rutin. Tambahkan hari latihan tetap — sesi 4 minggu ke depan terisi sendiri dan ortu bisa izin lebih awal.
          </p>
        )}
        <PatternForm ageGroupId={group.id} defaultLocation={ssb.homeGround ?? ""} />
      </section>

      <p className="px-1 text-sm text-muted">
        Sesi latihan, sesi tambahan, dan libur diatur dari{" "}
        <Link href={`/presensi?ku=${group.id}`} className="font-semibold text-primary hover:underline">
          kalender Presensi
        </Link>
        .
      </p>
    </div>
  );
}
