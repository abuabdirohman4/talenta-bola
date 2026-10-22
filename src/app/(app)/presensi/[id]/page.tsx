import { and, asc, desc, eq, isNull } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { ageGroups, attendances, parentPermissions, players, trainingSessions } from "@/db/schema";
import type { Mark, Permission } from "@/lib/attendance";
import { getSsb } from "@/lib/data";
import { AttendanceSheet } from "./_components/AttendanceSheet";

export const metadata: Metadata = { title: "Lembar presensi" };

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const ssb = await getSsb();

  const [session] = await db
    .select({ s: trainingSessions, groupName: ageGroups.name, groupCode: ageGroups.code })
    .from(trainingSessions)
    .innerJoin(ageGroups, eq(ageGroups.id, trainingSessions.ageGroupId))
    .where(and(eq(trainingSessions.id, id), eq(trainingSessions.ssbId, ssb.id), isNull(trainingSessions.deletedAt)));
  if (!session) notFound();
  const s = session.s;

  const [roster, marks, perms] = await Promise.all([
    db
      .select({
        id: players.id,
        fullName: players.fullName,
        nickname: players.nickname,
        jerseyNumber: players.jerseyNumber,
        position: players.position,
      })
      .from(players)
      .where(and(eq(players.ageGroupId, s.ageGroupId), eq(players.isActive, true), isNull(players.deletedAt)))
      .orderBy(asc(players.sortOrder), asc(players.fullName)),
    db.select().from(attendances).where(eq(attendances.sessionId, s.id)),
    db
      .select()
      .from(parentPermissions)
      .where(eq(parentPermissions.sessionId, s.id))
      .orderBy(desc(parentPermissions.createdAt)),
  ]);

  const markBy: Record<string, Mark> = {};
  for (const m of marks) markBy[m.playerId] = { status: m.status, updatedAt: m.updatedAt.getTime() };
  // Izin ganda: yang terbaru menang (query sudah urut terbaru dulu).
  const permBy: Record<string, Permission> = {};
  for (const p of perms) {
    permBy[p.playerId] ??= {
      id: p.id,
      type: p.type,
      reason: p.reason,
      createdAt: p.createdAt.getTime(),
      resolvedAt: p.resolvedAt?.getTime() ?? null,
    };
  }

  return (
    <AttendanceSheet
      session={{
        id: s.id,
        date: s.sessionDate,
        startTime: s.startTime,
        location: s.location,
        topic: s.topic,
        cancelled: s.status === "CANCELLED",
        cancelReason: s.cancelReason,
        groupName: session.groupName,
        groupCode: session.groupCode,
      }}
      roster={roster}
      serverMarks={markBy}
      permissions={permBy}
    />
  );
}
