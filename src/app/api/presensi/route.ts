import { and, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendances, players, trainingSessions } from "@/db/schema";
import { STATUSES, type Status } from "@/lib/attendance";
import { requireUser } from "@/lib/auth/require-user";
import { getSsb } from "@/lib/data";

type Mark = { sessionId: string; playerId: string; status: Status; at: number };

const UUID = /^[0-9a-f-]{36}$/i;
const isMark = (m: unknown): m is Mark => {
  const x = m as Mark;
  return (
    !!x &&
    UUID.test(x.sessionId) &&
    UUID.test(x.playerId) &&
    STATUSES.includes(x.status) &&
    Number.isFinite(x.at)
  );
};

/**
 * Terima antrean tap presensi dari HP pelatih (online maupun kiriman ulang setelah offline).
 * Idempoten: last-write-wins berdasarkan waktu tap di HP, jadi kiriman ulang yang lebih lama tidak menimpa yang baru.
 */
export async function POST(req: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Sesi habis, silakan masuk lagi" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { marks?: unknown[] } | null;
  const marks = (body?.marks ?? []).filter(isMark).slice(0, 500);
  if (!marks.length) return NextResponse.json({ saved: 0 });

  const ssb = await getSsb();
  const sessionIds = [...new Set(marks.map((m) => m.sessionId))];
  const playerIds = [...new Set(marks.map((m) => m.playerId))];
  // Hanya sesi & pemain milik SSB ini yang boleh disentuh.
  const [okSessions, okPlayers] = await Promise.all([
    db
      .select({ id: trainingSessions.id })
      .from(trainingSessions)
      .where(and(inArray(trainingSessions.id, sessionIds), eq(trainingSessions.ssbId, ssb.id), isNull(trainingSessions.deletedAt))),
    db
      .select({ id: players.id })
      .from(players)
      .where(and(inArray(players.id, playerIds), eq(players.ssbId, ssb.id))),
  ]);
  const sOk = new Set(okSessions.map((s) => s.id));
  const pOk = new Set(okPlayers.map((p) => p.id));

  // Satu tap terakhir per anak per sesi; jam HP yang kecepatan dibatasi ke jam server.
  const now = Date.now();
  const latest = new Map<string, Mark>();
  for (const m of marks) {
    if (!sOk.has(m.sessionId) || !pOk.has(m.playerId)) continue;
    const key = `${m.sessionId}:${m.playerId}`;
    if ((latest.get(key)?.at ?? -1) <= m.at) latest.set(key, { ...m, at: Math.min(m.at, now) });
  }
  const rows = [...latest.values()].map((m) => ({
    ssbId: ssb.id,
    sessionId: m.sessionId,
    playerId: m.playerId,
    status: m.status,
    updatedAt: new Date(m.at),
  }));
  if (rows.length) {
    await db
      .insert(attendances)
      .values(rows)
      .onConflictDoUpdate({
        target: [attendances.sessionId, attendances.playerId],
        set: { status: sql`excluded.status`, updatedAt: sql`excluded.updated_at` },
        setWhere: lte(attendances.updatedAt, sql`excluded.updated_at`),
      });
  }
  return NextResponse.json({ saved: rows.length });
}
