import "server-only";
import { and, eq, gte, isNull, lte, ne } from "drizzle-orm";
import { db } from "@/db";
import { attendances, trainingSessions } from "@/db/schema";
import { dateWib } from "./format";

/** Kehadiran satu anak di sesi yang sudah berlangsung (tidak libur, tanggal ≤ hari ini) dalam rentang tanggal. */
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
        from ? gte(trainingSessions.sessionDate, from) : undefined
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
