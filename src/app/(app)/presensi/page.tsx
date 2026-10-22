import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { CalendarDays, CalendarX2, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { KuSwitcher } from "@/components/KuSwitcher";
import { db } from "@/db";
import { attendances, parentPermissions, players, trainingSessions } from "@/db/schema";
import { getActiveGroup } from "@/lib/data";
import { formatDateId, formatTimeId, dateWib } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StartTodayButton } from "./_components/SessionControls";

export const metadata: Metadata = { title: "Presensi" };

export default async function PresensiPage({ searchParams }: { searchParams: Promise<{ ku?: string }> }) {
  const { groups, group } = await getActiveGroup((await searchParams).ku);
  if (!group) return <p className="rounded-2xl border border-dashed border-line bg-card p-6 text-center">Belum ada kelompok umur. Tambahkan di Pengaturan.</p>;

  const today = dateWib();
  const [sessions, [{ total }]] = await Promise.all([
    db
      .select()
      .from(trainingSessions)
      .where(and(eq(trainingSessions.ageGroupId, group.id), isNull(trainingSessions.deletedAt)))
      .orderBy(desc(trainingSessions.sessionDate))
      .limit(60),
    db
      .select({ total: count() })
      .from(players)
      .where(and(eq(players.ageGroupId, group.id), eq(players.isActive, true), isNull(players.deletedAt))),
  ]);
  const hadir = sessions.length
    ? await db
        .select({ sessionId: attendances.sessionId, n: count() })
        .from(attendances)
        .where(and(inArray(attendances.sessionId, sessions.map((s) => s.id)), eq(attendances.status, "HADIR")))
        .groupBy(attendances.sessionId)
    : [];
  const hadirBy = new Map(hadir.map((h) => [h.sessionId, h.n]));
  const todaySession = sessions.find((s) => s.sessionDate === today);
  const past = sessions.filter((s) => s.sessionDate <= today);
  const upcoming = sessions.filter((s) => s.sessionDate > today).reverse().slice(0, 8);
  const izin = upcoming.length
    ? await db
        .select({ sessionId: parentPermissions.sessionId, n: count() })
        .from(parentPermissions)
        .where(inArray(parentPermissions.sessionId, upcoming.map((s) => s.id)))
        .groupBy(parentPermissions.sessionId)
    : [];
  const izinBy = new Map(izin.map((i) => [i.sessionId, i.n]));

  const card = "rounded-2xl border border-line bg-card shadow-sm";

  return (
    <>
      <h2 className="mb-4 text-2xl font-extrabold tracking-tight md:hidden">Presensi {group.name}</h2>
      <KuSwitcher groups={groups} activeId={group.id} basePath="/presensi" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-start-3 lg:row-start-1">
          <section className={cn(card, "p-5")}>
            <p className="eyebrow">Hari ini</p>
            <p className="text-base font-black tracking-tight">{formatDateId(today)}</p>
            {todaySession ? (
              <Link
                href={`/presensi/${todaySession.id}`}
                className="mt-3 flex min-h-14 items-center justify-between rounded-xl bg-brand px-4 font-bold text-white shadow-md shadow-primary/25 hover:brightness-110"
              >
                {todaySession.status === "CANCELLED" ? "Lihat sesi (libur)" : "Lanjutkan presensi"}
                <span className="text-sm font-semibold text-white/85">
                  Hadir {hadirBy.get(todaySession.id) ?? 0}/{total}
                </span>
              </Link>
            ) : (
              <StartTodayButton ageGroupId={group.id} />
            )}
            <Link
              href={`/jadwal?ku=${group.id}`}
              className="mt-3 flex min-h-11 items-center gap-2 border-t border-line pt-3 text-[15px] font-bold text-primary hover:underline"
            >
              <CalendarDays size={18} aria-hidden /> Atur jadwal & sesi tambahan
            </Link>
          </section>

          {upcoming.length > 0 && (
            <section className={cn(card, "space-y-3 p-5")}>
              <h3 className="text-xs font-extrabold tracking-wider uppercase">Jadwal mendatang</h3>
              <ul className="space-y-2">
                {upcoming.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/presensi/${s.id}`}
                      className="flex min-h-14 items-center gap-3 rounded-xl border border-line bg-subtle p-2.5 hover:border-muted/40"
                    >
                      <DateBadge date={s.sessionDate} />
                      <p className="min-w-0 flex-1 text-sm leading-tight">
                        <span className="font-bold">{formatDateId(s.sessionDate)}</span>
                        <span className="text-muted"> · {formatTimeId(s.startTime)}</span>
                      </p>
                      {s.status === "CANCELLED" && (
                        <span className="rounded-md border border-izin/30 bg-warn-soft px-2 py-0.5 text-[11px] font-bold text-warn">Libur</span>
                      )}
                      {(izinBy.get(s.id) ?? 0) > 0 && (
                        <span className="rounded-md border border-izin/30 bg-izin/10 px-2 py-0.5 text-[11px] font-bold text-izin">
                          {izinBy.get(s.id)} izin
                        </span>
                      )}
                      <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <section className={cn(card, "space-y-3 p-5 lg:col-span-2 lg:col-start-1 lg:row-start-1")}>
          <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
            <h3 className="text-xs font-extrabold tracking-wider uppercase">Riwayat sesi latihan</h3>
            <span className="text-[11px] font-medium text-muted">{past.length} sesi</span>
          </div>
          {past.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line p-6 text-center text-muted">
              Belum ada sesi. Tekan <b>Mulai presensi hari ini</b> saat latihan dimulai — daftar {total} anak langsung
              muncul.
            </p>
          ) : (
            <ul className="space-y-2">
              {past.map((s) => {
                const n = hadirBy.get(s.id) ?? 0;
                return (
                  <li key={s.id}>
                    <Link
                      href={`/presensi/${s.id}`}
                      className="flex min-h-16 items-center gap-3 rounded-xl border border-line bg-subtle p-2.5 hover:border-muted/40"
                    >
                      <DateBadge date={s.sessionDate} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">{formatDateId(s.sessionDate)}</p>
                        <p className="truncate text-[11px] font-medium text-muted">
                          {formatTimeId(s.startTime)} WIB
                          {s.location ? ` · ${s.location}` : ""}
                        </p>
                      </div>
                      {s.status === "CANCELLED" ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-izin/30 bg-warn-soft px-2 py-0.5 text-[11px] font-bold text-warn">
                          <CalendarX2 size={12} aria-hidden /> Libur
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-md border border-hadir/30 bg-hadir/10 px-2 py-0.5 text-[11px] font-bold text-hadir">
                          Hadir {n}/{total}
                          {total ? <span className="hidden sm:inline"> ({Math.round((n / total) * 100)}%)</span> : null}
                        </span>
                      )}
                      <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

/** Lencana tanggal ala mockup jadwal: "07 SEP". */
function DateBadge({ date }: { date: string }) {
  const month = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", month: "short" }).format(new Date(date + "T00:00:00Z"));
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-ground text-center leading-none">
      <span>
        <span className="block text-sm font-black">{date.slice(8, 10)}</span>
        <span className="block text-[9px] font-bold text-muted uppercase">{month}</span>
      </span>
    </span>
  );
}
