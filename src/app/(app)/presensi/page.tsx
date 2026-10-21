import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { CalendarX2, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { KuSwitcher } from "@/components/KuSwitcher";
import { db } from "@/db";
import { attendances, parentPermissions, players, trainingSessions } from "@/db/schema";
import { getActiveGroup } from "@/lib/data";
import { formatDateId, formatTimeId, dateWib } from "@/lib/format";
import { NewSessionForm, StartTodayButton, WeeklyScheduleForm } from "./_components/SessionControls";

export const metadata: Metadata = { title: "Presensi" };

export default async function PresensiPage({ searchParams }: { searchParams: Promise<{ ku?: string }> }) {
  const { ssb, groups, group } = await getActiveGroup((await searchParams).ku);
  if (!group) return <p>Belum ada kelompok umur. Tambahkan di Pengaturan.</p>;

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

  return (
    <>
      <h2 className="mb-4 text-2xl font-extrabold tracking-tight">Presensi {group.name}</h2>
      <KuSwitcher groups={groups} activeId={group.id} basePath="/presensi" />

      <section className="rounded-2xl border border-line bg-card p-4">
        <p className="text-sm font-semibold text-muted">Hari ini · {formatDateId(today)}</p>
        {todaySession ? (
          <Link
            href={`/presensi/${todaySession.id}`}
            className="mt-3 flex min-h-14 items-center justify-between rounded-xl bg-primary px-4 font-bold text-white"
          >
            {todaySession.status === "CANCELLED" ? "Lihat sesi (libur)" : "Lanjutkan presensi"}
            <span className="text-sm font-semibold text-white/85">
              Hadir {hadirBy.get(todaySession.id) ?? 0}/{total}
            </span>
          </Link>
        ) : (
          <StartTodayButton ageGroupId={group.id} />
        )}
        <NewSessionForm ageGroupId={group.id} defaultLocation={ssb.homeGround ?? ""} />
        <WeeklyScheduleForm ageGroupId={group.id} defaultLocation={ssb.homeGround ?? ""} />
      </section>

      {upcoming.length > 0 && (
        <>
          <h3 className="mt-8 mb-3 text-lg font-bold">Jadwal mendatang</h3>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {upcoming.map((s) => (
              <li key={s.id}>
                <Link href={`/presensi/${s.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2.5 hover:bg-ground">
                  <p className="min-w-0 flex-1 truncate">
                    <span className="font-semibold">{formatDateId(s.sessionDate)}</span>
                    <span className="text-muted"> · {formatTimeId(s.startTime)}</span>
                  </p>
                  {s.status === "CANCELLED" && <span className="text-sm font-semibold text-warn">Libur</span>}
                  {(izinBy.get(s.id) ?? 0) > 0 && (
                    <span className="text-sm font-semibold text-izin">{izinBy.get(s.id)} izin</span>
                  )}
                  <ChevronRight size={18} className="text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <h3 className="mt-8 mb-3 text-lg font-bold">Riwayat sesi</h3>
      {past.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">
          Belum ada sesi. Tekan <b>Mulai presensi hari ini</b> saat latihan dimulai — daftar {total} anak langsung
          muncul.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
          {past.map((s) => (
            <li key={s.id}>
              <Link href={`/presensi/${s.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-ground">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{formatDateId(s.sessionDate)}</p>
                  <p className="truncate text-sm text-muted">
                    {formatTimeId(s.startTime)}
                    {s.location ? ` · ${s.location}` : ""}
                  </p>
                </div>
                {s.status === "CANCELLED" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2.5 py-1 text-sm font-semibold text-warn">
                    <CalendarX2 size={14} /> Libur
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-hadir">
                    Hadir {hadirBy.get(s.id) ?? 0}/{total}
                  </span>
                )}
                <ChevronRight size={18} className="text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
