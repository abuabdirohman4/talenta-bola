import { and, count, eq, gte, inArray, isNull, lt } from "drizzle-orm";
import { CalendarDays, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { KuSwitcher } from "@/components/KuSwitcher";
import { buttonClass } from "@/components/ui/Button";
import { db } from "@/db";
import { attendances, parentPermissions, players, trainingSessions } from "@/db/schema";
import type { Status } from "@/lib/attendance";
import { getActiveGroup } from "@/lib/data";
import { dateWib, formatDateId, formatTimeId } from "@/lib/format";
import { fillSessionsFromPatterns } from "@/lib/queries";
import { shiftMonth } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { PresensiCalendar, type DayInfo } from "./_components/PresensiCalendar";
import { StartTodayButton } from "./_components/SessionControls";

export const metadata: Metadata = { title: "Presensi" };

const card = "rounded-2xl border border-line bg-card shadow-sm";

/** "2026-10-25" → "Sab, 25 Okt". */
const shortDate = (d: string) =>
  new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(d + "T00:00:00Z")
  );

export default async function PresensiPage({ searchParams }: { searchParams: Promise<{ ku?: string; bulan?: string }> }) {
  const sp = await searchParams;
  const { ssb, groups, group } = await getActiveGroup(sp.ku);
  if (!group) return <p className="rounded-2xl border border-dashed border-line bg-card p-6 text-center">Belum ada kelompok umur. Tambahkan di Pengaturan.</p>;

  const today = dateWib();
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.bulan ?? "") ? sp.bulan! : today.slice(0, 7);
  // Jadwal rutin mengisi sesi 4 minggu ke depan supaya kalender tidak kosong.
  await fillSessionsFromPatterns(ssb.id, group.id, ssb.homeGround);

  const live = and(eq(trainingSessions.ageGroupId, group.id), isNull(trainingSessions.deletedAt));
  const [sessions, [todaySession], [{ total }]] = await Promise.all([
    db
      .select()
      .from(trainingSessions)
      .where(and(live, gte(trainingSessions.sessionDate, month + "-01"), lt(trainingSessions.sessionDate, shiftMonth(month, 1) + "-01")))
      .orderBy(trainingSessions.sessionDate),
    db.select().from(trainingSessions).where(and(live, eq(trainingSessions.sessionDate, today))),
    db
      .select({ total: count() })
      .from(players)
      .where(and(eq(players.ageGroupId, group.id), eq(players.isActive, true), isNull(players.deletedAt))),
  ]);
  const ids = sessions.map((s) => s.id);
  const [marks, izin, [todayHadir]] = await Promise.all([
    ids.length
      ? db
          .select({ sessionId: attendances.sessionId, status: attendances.status, n: count() })
          .from(attendances)
          .where(inArray(attendances.sessionId, ids))
          .groupBy(attendances.sessionId, attendances.status)
      : [],
    ids.length
      ? db
          .select({ sessionId: parentPermissions.sessionId, n: count() })
          .from(parentPermissions)
          .where(inArray(parentPermissions.sessionId, ids))
          .groupBy(parentPermissions.sessionId)
      : [],
    todaySession
      ? db
          .select({ n: count() })
          .from(attendances)
          .where(and(eq(attendances.sessionId, todaySession.id), eq(attendances.status, "HADIR")))
      : [{ n: 0 }],
  ]);

  const tally = new Map<string, Record<Status, number>>();
  for (const m of marks) {
    const t = tally.get(m.sessionId) ?? { HADIR: 0, IZIN: 0, SAKIT: 0, ALPA: 0 };
    t[m.status] = m.n;
    tally.set(m.sessionId, t);
  }
  const izinBy = new Map(izin.map((i) => [i.sessionId, i.n]));
  const pctOf = (t: Record<Status, number> | undefined) => (t && total ? Math.round((t.HADIR / total) * 100) : null);

  const days: Record<string, DayInfo> = {};
  for (const s of sessions) {
    days[s.sessionDate] = {
      id: s.id,
      state: s.status === "CANCELLED" ? "cancelled" : tally.has(s.id) ? "done" : "planned",
      pct: pctOf(tally.get(s.id)),
    };
  }

  return (
    <>
      <h2 className="mb-4 text-2xl font-extrabold tracking-tight md:hidden">Presensi {group.name}</h2>
      <KuSwitcher groups={groups} activeId={group.id} basePath="/presensi" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-start">
        <div className="space-y-4">
          {/* Pintu utama: satu tombol untuk sesi hari ini. */}
          <section className={cn(card, "flex items-center justify-between gap-3 p-4")}>
            <div className="min-w-0">
              <p className="text-xs text-muted">Hari ini</p>
              <p className="font-bold">{shortDate(today)}</p>
            </div>
            {todaySession ? (
              <Link href={`/presensi/${todaySession.id}`} className={buttonClass("primary", "md", "shrink-0 px-4")}>
                {todaySession.status === "CANCELLED" ? "Lihat sesi (libur)" : `Lanjutkan · ${todayHadir!.n}/${total} hadir`}
              </Link>
            ) : (
              <StartTodayButton ageGroupId={group.id} size="md" label="Mulai presensi" className="mt-0 w-auto shrink-0 px-4" />
            )}
          </section>

          <PresensiCalendar month={month} today={today} days={days} ageGroupId={group.id} />
          <Link
            href={`/jadwal?ku=${group.id}`}
            className="flex min-h-11 items-center gap-2 px-1 text-sm font-semibold text-primary hover:underline"
          >
            <CalendarDays size={18} aria-hidden /> Atur jadwal rutin
          </Link>
        </div>

        <section className={cn(card, "overflow-hidden")}>
          <h3 className="border-b border-line px-4 py-3 text-sm font-bold">Sesi bulan ini ({sessions.length})</h3>
          {sessions.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted">
              Belum ada sesi bulan ini. Ketuk tanggal di kalender untuk membuat sesi, atau atur jadwal rutin.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {sessions.map((s) => {
                const t = tally.get(s.id);
                const pct = pctOf(t);
                const alpa = t ? total - t.HADIR - t.IZIN - t.SAKIT : 0;
                return (
                  <li key={s.id}>
                    <Link href={`/presensi/${s.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2.5 hover:bg-subtle">
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm font-semibold", s.sessionDate === today && "text-primary")}>
                          {shortDate(s.sessionDate)} · {formatTimeId(s.startTime)}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {s.status === "CANCELLED"
                            ? `Libur${s.cancelReason ? `: ${s.cancelReason}` : ""}`
                            : t
                              ? `${t.HADIR} hadir · ${t.IZIN} izin · ${t.SAKIT} sakit · ${alpa} alpa`
                              : `${s.sessionDate < today ? "Belum diisi" : "Terjadwal"}${izinBy.get(s.id) ? ` · ${izinBy.get(s.id)} izin dari ortu` : ""}`}
                        </p>
                      </div>
                      {pct != null && s.status !== "CANCELLED" && (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold",
                            pct >= 80 ? "bg-hadir/15 text-hadir" : pct >= 60 ? "bg-izin/15 text-izin" : "bg-alpa/15 text-alpa"
                          )}
                        >
                          {pct}%
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
