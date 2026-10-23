import "server-only";
import { and, count, eq, gte, inArray, isNull, lt, lte, ne } from "drizzle-orm";
import { db } from "@/db";
import { attendances, parentPermissions, trainingPatterns, trainingSessions } from "@/db/schema";
import type { Status } from "./attendance";
import { dateWib } from "./format";
import { shiftMonth, weekdayDates } from "./schedule";

/** Kehadiran satu anak di sesi yang sudah dicatat pelatih (tidak libur, tanggal ≤ hari ini, ada isian presensi) dalam rentang tanggal. */
export async function getAttendanceSummary(playerId: string, ageGroupId: string, from?: string, to?: string) {
  const today = dateWib();
  const end = to && to < today ? to : today;
  const sessions = await db
    .select({ id: trainingSessions.id, date: trainingSessions.sessionDate, status: attendances.status, note: attendances.note })
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
    recent: sessions.slice(-8).map((s) => ({ date: s.date, status: s.status ?? null, note: s.note })),
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

export type DayInfo = { id: string; state: "done" | "planned" | "cancelled"; pct: number | null };

/** Sesi satu KU dalam bulan "YYYY-MM" + hitungan status per sesi; dipakai kalender Presensi & Jadwal. */
export async function getMonthSessions(ageGroupId: string, month: string, totalPlayers: number) {
  const sessions = await db
    .select()
    .from(trainingSessions)
    .where(
      and(
        eq(trainingSessions.ageGroupId, ageGroupId),
        isNull(trainingSessions.deletedAt),
        gte(trainingSessions.sessionDate, month + "-01"),
        lt(trainingSessions.sessionDate, shiftMonth(month, 1) + "-01")
      )
    )
    .orderBy(trainingSessions.sessionDate);
  const ids = sessions.map((s) => s.id);
  const [marks, izin] = ids.length
    ? await Promise.all([
        db
          .select({ sessionId: attendances.sessionId, status: attendances.status, n: count() })
          .from(attendances)
          .where(inArray(attendances.sessionId, ids))
          .groupBy(attendances.sessionId, attendances.status),
        db
          .select({ sessionId: parentPermissions.sessionId, n: count() })
          .from(parentPermissions)
          .where(inArray(parentPermissions.sessionId, ids))
          .groupBy(parentPermissions.sessionId),
      ])
    : [[], []];
  const tally = new Map<string, Record<Status, number>>();
  for (const m of marks) {
    const t = tally.get(m.sessionId) ?? { HADIR: 0, IZIN: 0, SAKIT: 0, ALPA: 0 };
    t[m.status] = m.n;
    tally.set(m.sessionId, t);
  }
  const pctOf = (id: string) => {
    const t = tally.get(id);
    return t && totalPlayers ? Math.round((t.HADIR / totalPlayers) * 100) : null;
  };
  const days: Record<string, DayInfo> = {};
  for (const s of sessions) {
    days[s.sessionDate] = { id: s.id, state: s.status === "CANCELLED" ? "cancelled" : tally.has(s.id) ? "done" : "planned", pct: pctOf(s.id) };
  }
  return { sessions, tally, izinBy: new Map(izin.map((i) => [i.sessionId, i.n])), days, pctOf };
}
