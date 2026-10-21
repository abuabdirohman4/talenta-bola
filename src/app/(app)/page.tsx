import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, lte, ne, or } from "drizzle-orm";
import { ChevronRight, ClipboardCheck, NotebookPen, TriangleAlert, Users } from "lucide-react";
import Link from "next/link";
import { KuSwitcher } from "@/components/KuSwitcher";
import { db } from "@/db";
import { attendances, players, reportPeriods, reports, trainingSessions } from "@/db/schema";
import { getActiveGroup } from "@/lib/data";
import { addDays, formatDateId, formatTimeId, dateWib } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StartTodayButton } from "./presensi/_components/SessionControls";

export default async function BerandaPage({ searchParams }: { searchParams: Promise<{ ku?: string }> }) {
  const { ssb, groups, group } = await getActiveGroup((await searchParams).ku);
  if (!group) {
    return (
      <p className="rounded-2xl border border-dashed border-line bg-card p-6 text-center">
        Belum ada kelompok umur. <Link href="/pengaturan" className="font-semibold text-primary underline">Tambahkan di Pengaturan</Link>.
      </p>
    );
  }

  const today = dateWib();
  const monthAgo = addDays(today, -30);
  const activePlayer = and(eq(players.ageGroupId, group.id), eq(players.isActive, true), isNull(players.deletedAt));

  const [[next], [{ total }], [{ incomplete }], recentSessions, [period]] = await Promise.all([
    db
      .select()
      .from(trainingSessions)
      .where(
        and(
          eq(trainingSessions.ageGroupId, group.id),
          isNull(trainingSessions.deletedAt),
          ne(trainingSessions.status, "CANCELLED"),
          gte(trainingSessions.sessionDate, today)
        )
      )
      .orderBy(asc(trainingSessions.sessionDate))
      .limit(1),
    db.select({ total: count() }).from(players).where(activePlayer),
    db
      .select({ incomplete: count() })
      .from(players)
      .where(and(activePlayer, or(isNull(players.birthDate), isNull(players.parentPhoneWa)))),
    db
      .select({ id: trainingSessions.id })
      .from(trainingSessions)
      .where(
        and(
          eq(trainingSessions.ageGroupId, group.id),
          isNull(trainingSessions.deletedAt),
          ne(trainingSessions.status, "CANCELLED"),
          gte(trainingSessions.sessionDate, monthAgo),
          lte(trainingSessions.sessionDate, today)
        )
      ),
    db
      .select()
      .from(reportPeriods)
      .where(
        and(
          eq(reportPeriods.ageGroupId, group.id),
          isNull(reportPeriods.deletedAt),
          lte(reportPeriods.startDate, today),
          gte(reportPeriods.endDate, today)
        )
      )
      .orderBy(desc(reportPeriods.startDate))
      .limit(1),
  ]);

  const ids = recentSessions.map((s) => s.id);
  const [[hadir], [published]] = await Promise.all([
    ids.length
      ? db.select({ n: count() }).from(attendances).where(and(inArray(attendances.sessionId, ids), eq(attendances.status, "HADIR")))
      : [{ n: 0 }],
    period
      ? db.select({ n: count() }).from(reports).where(and(eq(reports.periodId, period.id), isNotNull(reports.publishedAt)))
      : [{ n: 0 }],
  ]);
  const rate = ids.length && total ? Math.round((hadir!.n / (ids.length * total)) * 100) : null;
  const isToday = next?.sessionDate === today;

  return (
    <>
      <p className="text-muted">Selamat datang, {ssb.headCoachName ?? "Coach"}</p>
      <h2 className="mb-4 text-2xl font-extrabold tracking-tight">{group.name}</h2>
      <KuSwitcher groups={groups} activeId={group.id} basePath="/" />

      <section className="rounded-2xl bg-primary p-5 text-white">
        <p className="text-sm font-semibold text-white/80">{isToday ? "Latihan hari ini" : next ? "Latihan berikutnya" : "Hari ini"}</p>
        <p className="mt-1 text-xl font-extrabold">{formatDateId(next?.sessionDate ?? today)}</p>
        {next && (
          <p className="text-white/85">
            {formatTimeId(next.startTime)}
            {next.location ? ` · ${next.location}` : ""}
          </p>
        )}
        {isToday ? (
          <Link
            href={`/presensi/${next!.id}`}
            className="mt-4 flex min-h-14 items-center justify-center gap-2 rounded-xl bg-white font-bold text-primary"
          >
            <ClipboardCheck size={20} aria-hidden /> Buka presensi
          </Link>
        ) : (
          <StartTodayButton ageGroupId={group.id} className="bg-white text-primary hover:bg-white/90" />
        )}
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat href={`/pemain?ku=${group.id}`} icon={Users} label="Pemain aktif" value={String(total)} />
        <Stat
          href={`/presensi?ku=${group.id}`}
          icon={ClipboardCheck}
          label="Kehadiran 30 hari"
          value={rate == null ? "—" : `${rate}%`}
          note={`${ids.length} sesi`}
        />
        <Stat
          href={period ? `/rapor/${period.id}` : `/rapor?ku=${group.id}`}
          icon={NotebookPen}
          label="Rapor terbit"
          value={period ? `${published!.n}/${total}` : "—"}
          note={period?.name ?? "Tidak ada periode aktif"}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {incomplete > 0 && (
        <Link
          href={`/pemain?ku=${group.id}`}
          className="mt-4 flex min-h-14 items-center gap-3 rounded-2xl border border-izin/30 bg-warn-soft px-4 py-3 text-warn"
        >
          <TriangleAlert size={20} className="shrink-0" aria-hidden />
          <span className="flex-1 text-[15px]">
            <b>{incomplete} pemain</b> belum lengkap (tanggal lahir / WA ortu). Lengkapi supaya link ortu & rapor bisa dikirim.
          </span>
          <ChevronRight size={18} aria-hidden />
        </Link>
      )}
    </>
  );
}

function Stat({
  href,
  icon: Icon,
  label,
  value,
  note,
  className,
}: {
  href: string;
  icon: typeof Users;
  label: string;
  value: string;
  note?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("rounded-2xl border border-line bg-card p-4 hover:bg-ground", className)}>
      <Icon size={20} className="text-primary" aria-hidden />
      <p className="mt-2 text-3xl font-extrabold">{value}</p>
      <p className="text-sm font-semibold">{label}</p>
      {note && <p className="truncate text-xs text-muted">{note}</p>}
    </Link>
  );
}
