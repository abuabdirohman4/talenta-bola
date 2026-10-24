import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, lte, ne, sql } from "drizzle-orm";
import { FileInput, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { db } from "@/db";
import { attendances, players, reportPeriods, reports, reportScores, trainingSessions } from "@/db/schema";
import type { Status } from "@/lib/attendance";
import { getActiveGroup } from "@/lib/data";
import { addDays, dateWib } from "@/lib/format";
import { PlayerList, type ReportState } from "./_components/PlayerList";

export const metadata: Metadata = { title: "Pemain" };

/** Dua tombol aksi berbagi satu baris di HP 360px tanpa teks terlipat. */
const MOBILE_BTN = "flex-1 whitespace-nowrap px-3 text-sm sm:flex-none sm:px-4 sm:text-[15px]";

export default async function PemainPage({ searchParams }: { searchParams: Promise<{ ku?: string }> }) {
  const { groups, group } = await getActiveGroup((await searchParams).ku);
  if (!group) return <p>Belum ada kelompok umur. Tambahkan di Pengaturan.</p>;

  const today = dateWib();
  const recent = and(
    eq(trainingSessions.ageGroupId, group.id),
    isNull(trainingSessions.deletedAt),
    ne(trainingSessions.status, "CANCELLED"),
    gte(trainingSessions.sessionDate, addDays(today, -30)),
    lte(trainingSessions.sessionDate, today),
    inArray(trainingSessions.id, db.select({ id: attendances.sessionId }).from(attendances))
  );

  const [rows, [period], [{ sessions }], hadirRows, lastSessions, ratingRows] = await Promise.all([
    db
      .select({
        id: players.id,
        fullName: players.fullName,
        nickname: players.nickname,
        jerseyNumber: players.jerseyNumber,
        position: players.position,
        preferredFoot: players.preferredFoot,
        birthDate: players.birthDate,
        parentName: players.parentName,
        parentPhoneWa: players.parentPhoneWa,
        isActive: players.isActive,
        hasPhoto: sql<boolean>`${players.photoUrl} is not null`,
        updatedAt: players.updatedAt,
      })
      .from(players)
      .where(and(eq(players.ageGroupId, group.id), isNull(players.deletedAt)))
      .orderBy(asc(players.sortOrder), asc(players.fullName)),
    db
      .select({ id: reportPeriods.id, name: reportPeriods.name })
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
    db.select({ sessions: count() }).from(trainingSessions).where(recent),
    db
      .select({ playerId: attendances.playerId, n: count() })
      .from(attendances)
      .where(and(eq(attendances.status, "HADIR"), inArray(attendances.sessionId, db.select({ id: trainingSessions.id }).from(trainingSessions).where(recent))))
      .groupBy(attendances.playerId),
    // 5 latihan terakhir yang sudah diisi, untuk deret "form" per anak.
    db
      .select({ id: trainingSessions.id, date: trainingSessions.sessionDate })
      .from(trainingSessions)
      .where(
        and(
          eq(trainingSessions.ageGroupId, group.id),
          isNull(trainingSessions.deletedAt),
          ne(trainingSessions.status, "CANCELLED"),
          lte(trainingSessions.sessionDate, today),
          inArray(trainingSessions.id, db.select({ id: attendances.sessionId }).from(attendances))
        )
      )
      .orderBy(desc(trainingSessions.sessionDate))
      .limit(5),
    // Nilai = rata-rata skor rapor terbit terbaru per anak.
    db
      .select({ playerId: reports.playerId, avg: sql<string>`avg(${reportScores.score})` })
      .from(reports)
      .innerJoin(reportPeriods, eq(reports.periodId, reportPeriods.id))
      .innerJoin(reportScores, eq(reportScores.reportId, reports.id))
      .where(and(eq(reportPeriods.ageGroupId, group.id), isNull(reportPeriods.deletedAt), isNotNull(reports.publishedAt)))
      .groupBy(reports.id, reports.playerId, reportPeriods.startDate)
      .orderBy(desc(reportPeriods.startDate)),
  ]);

  const reportRows = period
    ? await db
        .select({ playerId: reports.playerId, publishedAt: reports.publishedAt })
        .from(reports)
        .where(eq(reports.periodId, period.id))
    : [];
  const hadir = new Map(hadirRows.map((r) => [r.playerId, r.n]));
  const formSessions = lastSessions.reverse();
  const marks = formSessions.length
    ? await db
        .select({ sessionId: attendances.sessionId, playerId: attendances.playerId, status: attendances.status })
        .from(attendances)
        .where(inArray(attendances.sessionId, formSessions.map((x) => x.id)))
    : [];
  const markOf = new Map(marks.map((m) => [`${m.sessionId}:${m.playerId}`, m.status as Status]));
  const rating = new Map<string, number>();
  for (const r of ratingRows) if (!rating.has(r.playerId)) rating.set(r.playerId, Number(r.avg));
  const reportOf = new Map(reportRows.map((r) => [r.playerId, r.publishedAt ? "PUBLISHED" : "DRAFT"] as const));

  const list = rows.map(({ hasPhoto, updatedAt, ...p }) => ({
    ...p,
    photo: hasPhoto ? `/api/pemain/${p.id}/foto?v=${updatedAt.getTime()}` : null,
    // Belum ditandai = alpa, sama dengan lembar presensi.
    form: formSessions.map((x) => ({ date: x.date, status: markOf.get(`${x.id}:${p.id}`) ?? ("ALPA" as Status) })),
    rating: rating.get(p.id) ?? null,
    rate: sessions ? Math.round(((hadir.get(p.id) ?? 0) / sessions) * 100) : null,
    report: (period ? (reportOf.get(p.id) ?? "NONE") : null) as ReportState | null,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold tracking-tight md:hidden">Data pemain</h2>
        <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
          <Link href={`/pemain/impor?ku=${group.id}`} className={buttonClass("outline", "md", MOBILE_BTN)}>
            <FileInput size={18} aria-hidden /> Impor dari WA
          </Link>
          <Link href={`/pemain/baru?ku=${group.id}`} className={buttonClass("primary", "md", MOBILE_BTN)}>
            <UserPlus size={18} aria-hidden /> Tambah Pemain
          </Link>
        </div>
      </div>

      <PlayerList players={list} importHref={`/pemain/impor?ku=${group.id}`} periodName={period?.name ?? null} />
    </div>
  );
}
