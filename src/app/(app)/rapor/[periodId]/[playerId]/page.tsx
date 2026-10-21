import { and, asc, eq, isNull } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { players, reportPeriods, reports, reportScores } from "@/db/schema";
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
    .select({ id: players.id })
    .from(players)
    .where(and(eq(players.ageGroupId, period.ageGroupId), eq(players.isActive, true), isNull(players.deletedAt)))
    .orderBy(asc(players.sortOrder), asc(players.fullName));
  const idx = roster.findIndex((r) => r.id === playerId);

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
