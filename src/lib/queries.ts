import "server-only";
import { and, eq, gte, inArray, isNull, lte, ne } from "drizzle-orm";
import { db } from "@/db";
import { attendances, trainingPatterns, trainingSessions } from "@/db/schema";
import { dateWib } from "./format";
import { weekdayDates } from "./schedule";

/** Kehadiran satu anak di sesi yang sudah dicatat pelatih (tidak libur, tanggal ≤ hari ini, ada isian presensi) dalam rentang tanggal. */
export async function getAttendanceSummary(playerId: string, ageGroupId: string, from?: string, to?: string) {
  const today = dateWib();
  const end = to && to < today ? to : today;
  const sessions = await db
    .select({ id: trainingSessions.id, date: trainingSessions.sessionDate, status: attendances.status })
    .from(trainingSessions)
    .leftJoin(
      attendances,
      and(eq(attendances.sessionId, trainingSessions.id), eq(attendances.playerId, playerId))
    )
    .where(
      and(
        eq(trainingSessions.ageGroupId, ageGroupId),
        isNull(trainingSessions.deletedAt),
        ne(trainingSessions.status, "CANCELLED"),
        lte(trainingSessions.sessionDate, end),
        from ? gte(trainingSessions.sessionDate, from) : undefined,
        // Sesi yang belum dibuka pelatih bukan "tidak hadir" — jangan menurunkan persentase anak.
        inArray(trainingSessions.id, db.selectDistinct({ id: attendances.sessionId }).from(attendances))
      )
    )
    .orderBy(trainingSessions.sessionDate);
  const hadir = sessions.filter((s) => s.status === "HADIR").length;
  return {
    held: sessions.length,
    hadir,
    rate: sessions.length ? Math.round((hadir / sessions.length) * 100) : null,
    recent: sessions.slice(-8).map((s) => ({ date: s.date, status: s.status ?? null })),
  };
}

/** Isi sesi 4 minggu ke depan dari jadwal rutin KU; idempoten — tanggal yang sudah punya sesi (termasuk yang diliburkan) dilewati. */
export async function fillSessionsFromPatterns(ssbId: string, ageGroupId: string, homeGround: string | null) {
  const today = dateWib();
  const patterns = await db
    .select()
    .from(trainingPatterns)
    .where(and(eq(trainingPatterns.ssbId, ssbId), eq(trainingPatterns.ageGroupId, ageGroupId), isNull(trainingPatterns.deletedAt)));
  const rows = patterns.flatMap((p) =>
    weekdayDates(p.weekday, today).map((sessionDate) => ({
      ssbId,
      ageGroupId,
      patternId: p.id,
      sessionDate,
      startTime: p.startTime,
      location: p.location ?? homeGround,
      topic: p.topic,
    }))
  );
  // Partial unique (KU, tanggal) WHERE deleted_at IS NULL yang menjaga: sesi yang ada — juga yang libur — tidak disentuh.
  if (rows.length) await db.insert(trainingSessions).values(rows).onConflictDoNothing();
}
