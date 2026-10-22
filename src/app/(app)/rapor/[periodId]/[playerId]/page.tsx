import { and, asc, count, eq, gte, inArray, isNull, lte, ne } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { attendances, players, reportPeriods, reports, reportScores, trainingSessions } from "@/db/schema";
import { dateWib } from "@/lib/format";
import { getBaseUrl, getSsb } from "@/lib/data";
import { positionLabel } from "@/lib/players";
import { getAttendanceSummary } from "@/lib/queries";
import { ReportForm } from "./_components/ReportForm";

export const metadata: Metadata = { title: "Isi rapor" };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function ReportPage({ params }: { params: Promise<{ periodId: string; playerId: string }> }) {
  const { periodId, playerId } = await params;
  if (!UUID.test(periodId) || !UUID.test(playerId)) notFound();
  const ssb = await getSsb();

  const [period] = await db
    .select()
    .from(reportPeriods)
    .where(and(eq(reportPeriods.id, periodId), eq(reportPeriods.ssbId, ssb.id), isNull(reportPeriods.deletedAt)));
  if (!period) notFound();

  // Urutan anak sama dengan daftar presensi, supaya "berikutnya" tidak lompat.
  const roster = await db
    .select({
      id: players.id,
      name: players.fullName,
      jersey: players.jerseyNumber,
      position: players.position,
      reportId: reports.id,
      publishedAt: reports.publishedAt,
    })
    .from(players)
    .leftJoin(reports, and(eq(reports.playerId, players.id), eq(reports.periodId, period.id)))
    .where(and(eq(players.ageGroupId, period.ageGroupId), eq(players.isActive, true), isNull(players.deletedAt)))
    .orderBy(asc(players.sortOrder), asc(players.fullName));
  const idx = roster.findIndex((r) => r.id === playerId);

  // Daftar roster di sisi kiri: rata-rata skor + presensi per anak, satu query per jenis (bukan per anak).
  const end = period.endDate < dateWib() ? period.endDate : dateWib();
  const held = await db
    .select({ id: trainingSessions.id })
    .from(trainingSessions)
    .where(
      and(
        eq(trainingSessions.ageGroupId, period.ageGroupId),
        isNull(trainingSessions.deletedAt),
        ne(trainingSessions.status, "CANCELLED"),
        gte(trainingSessions.sessionDate, period.startDate),
        lte(trainingSessions.sessionDate, end)
      )
    );
  const reportIds = roster.flatMap((r) => (r.reportId ? [r.reportId] : []));
  const [hadirRows, scoreRows] = await Promise.all([
    held.length
      ? db
          .select({ playerId: attendances.playerId, n: count() })
          .from(attendances)
          .where(and(inArray(attendances.sessionId, held.map((h) => h.id)), eq(attendances.status, "HADIR")))
          .groupBy(attendances.playerId)
      : [],
    reportIds.length ? db.select().from(reportScores).where(inArray(reportScores.reportId, reportIds)) : [],
  ]);
  const hadirBy = new Map(hadirRows.map((h) => [h.playerId, h.n]));
  const scoresBy = new Map<string, Record<string, number>>();
  for (const s of scoreRows) scoresBy.set(s.reportId, { ...scoresBy.get(s.reportId), [s.aspectKey]: s.score });

  const [[player], [report], attendance] = await Promise.all([
    db
      .select()
      .from(players)
      .where(and(eq(players.id, playerId), eq(players.ssbId, ssb.id), isNull(players.deletedAt))),
    db.select().from(reports).where(and(eq(reports.periodId, period.id), eq(reports.playerId, playerId))),
    getAttendanceSummary(playerId, period.ageGroupId, period.startDate, period.endDate),
  ]);
  if (!player) notFound();
  const scores = report
    ? Object.fromEntries(
        (await db.select().from(reportScores).where(eq(reportScores.reportId, report.id))).map((s) => [s.aspectKey, s.score])
      )
    : {};

  return (
    <ReportForm
      key={player.id}
      period={{ id: period.id, name: period.name }}
      player={{
        id: player.id,
        fullName: player.fullName,
        photoUrl: player.photoUrl,
        position: positionLabel(player.position),
        jerseyNumber: player.jerseyNumber,
        parentPhoneWa: player.parentPhoneWa,
      }}
      nav={{
        index: idx,
        total: roster.length,
        prevId: idx > 0 ? roster[idx - 1]!.id : null,
        nextId: idx >= 0 && idx < roster.length - 1 ? roster[idx + 1]!.id : null,
      }}
      roster={roster.map((r) => ({
        id: r.id,
        name: r.name,
        jersey: r.jersey,
        position: positionLabel(r.position),
        rate: held.length ? Math.round(((hadirBy.get(r.id) ?? 0) / held.length) * 100) : null,
        status: r.publishedAt ? "published" : r.reportId ? "draft" : "none",
        scores: r.reportId ? (scoresBy.get(r.reportId) ?? {}) : {},
      }))}
      attendance={{ hadir: attendance.hadir, held: attendance.held, rate: attendance.rate }}
      initial={{
        scores,
        narrative: {
          strengths: report?.strengths ?? "",
          improvements: report?.improvements ?? "",
          nextTarget: report?.nextTarget ?? "",
          homeTraining: report?.homeTraining ?? "",
        },
        publishedAt: report?.publishedAt?.toISOString() ?? null,
        publicToken: report?.publicToken ?? null,
      }}
      baseUrl={await getBaseUrl()}
      ssbName={ssb.name}
    />
  );
}
