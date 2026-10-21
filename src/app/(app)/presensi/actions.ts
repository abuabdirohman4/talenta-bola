"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { ageGroups, attendances, parentPermissions, trainingSessions } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { getSsb } from "@/lib/data";
import { addDays, dateWib } from "@/lib/format";

type Result = { error: string } | undefined;

async function ownGroup(ssbId: string, ageGroupId: string) {
  const [g] = await db
    .select({ id: ageGroups.id })
    .from(ageGroups)
    .where(and(eq(ageGroups.id, ageGroupId), eq(ageGroups.ssbId, ssbId), isNull(ageGroups.deletedAt)));
  return g;
}

/** Buka sesi untuk tanggal itu; kalau sudah ada, pakai yang ada (satu sesi per KU per hari). */
export async function openSession(input: {
  ageGroupId: string;
  date?: string;
  startTime?: string;
  location?: string;
}): Promise<Result> {
  await requireUser();
  const ssb = await getSsb();
  if (!(await ownGroup(ssb.id, input.ageGroupId))) return { error: "Kelompok umur tidak ditemukan" };

  const date = input.date || dateWib();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Tanggal tidak valid" };
  const startTime = input.startTime && /^\d{2}:\d{2}$/.test(input.startTime) ? input.startTime : "07:30";

  const [existing] = await db
    .select({ id: trainingSessions.id })
    .from(trainingSessions)
    .where(
      and(
        eq(trainingSessions.ageGroupId, input.ageGroupId),
        eq(trainingSessions.sessionDate, date),
        isNull(trainingSessions.deletedAt)
      )
    );
  let id = existing?.id;
  if (!id) {
    const [s] = await db
      .insert(trainingSessions)
      .values({
        ssbId: ssb.id,
        ageGroupId: input.ageGroupId,
        sessionDate: date,
        startTime,
        location: input.location?.trim() || ssb.homeGround,
      })
      .returning({ id: trainingSessions.id });
    id = s!.id;
  }
  revalidatePath("/presensi");
  redirect(`/presensi/${id}`);
}

/** Jadwal rutin: buat sesi untuk hari-hari terpilih beberapa minggu ke depan, supaya ortu bisa izin sebelum hari H. */
export async function scheduleWeekly(input: {
  ageGroupId: string;
  weekdays: number[]; // 0 = Minggu … 6 = Sabtu
  startTime: string;
  location: string;
  weeks: number;
}): Promise<{ created?: number; error?: string }> {
  await requireUser();
  const ssb = await getSsb();
  if (!(await ownGroup(ssb.id, input.ageGroupId))) return { error: "Kelompok umur tidak ditemukan" };
  const days = new Set(input.weekdays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6));
  if (!days.size) return { error: "Pilih minimal satu hari" };
  if (!/^\d{2}:\d{2}$/.test(input.startTime)) return { error: "Jam tidak valid" };
  const weeks = Math.min(Math.max(Math.trunc(input.weeks) || 4, 1), 12);

  const today = dateWib();
  const dates: string[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(today, i);
    if (days.has(new Date(d + "T00:00:00Z").getUTCDay())) dates.push(d);
  }
  const rows = await db
    .insert(trainingSessions)
    .values(
      dates.map((d) => ({
        ssbId: ssb.id,
        ageGroupId: input.ageGroupId,
        sessionDate: d,
        startTime: input.startTime,
        location: input.location.trim() || ssb.homeGround,
      }))
    )
    // Tanggal yang sudah punya sesi dilewati (partial unique per KU per tanggal).
    .onConflictDoNothing()
    .returning({ id: trainingSessions.id });
  revalidatePath("/presensi");
  return { created: rows.length };
}

/** Libur (hujan/lapangan dipakai): sesi tetap ada sebagai riwayat, ortu tidak bisa izin lagi. */
export async function setSessionCancelled(sessionId: string, cancelled: boolean): Promise<void> {
  await requireUser();
  const ssb = await getSsb();
  await db
    .update(trainingSessions)
    .set({ status: cancelled ? "CANCELLED" : "SCHEDULED", updatedAt: new Date() })
    .where(and(eq(trainingSessions.id, sessionId), eq(trainingSessions.ssbId, ssb.id)));
  revalidatePath("/presensi");
  revalidatePath(`/presensi/${sessionId}`);
}

export async function updateSessionInfo(
  sessionId: string,
  input: { startTime: string; location: string; topic: string }
): Promise<Result> {
  await requireUser();
  const ssb = await getSsb();
  if (!/^\d{2}:\d{2}/.test(input.startTime)) return { error: "Jam tidak valid" };
  await db
    .update(trainingSessions)
    .set({
      startTime: input.startTime.slice(0, 5),
      location: input.location.trim() || null,
      topic: input.topic.trim() || null,
      updatedAt: new Date(),
    })
    .where(and(eq(trainingSessions.id, sessionId), eq(trainingSessions.ssbId, ssb.id)));
  revalidatePath(`/presensi/${sessionId}`);
}

/** Pelatih memutuskan pengajuan izin yang masuk setelah ia mengisi presensi anak itu. */
export async function resolvePermission(permissionId: string, accept: boolean): Promise<Result> {
  await requireUser();
  const ssb = await getSsb();
  const [p] = await db
    .select()
    .from(parentPermissions)
    .where(and(eq(parentPermissions.id, permissionId), eq(parentPermissions.ssbId, ssb.id)));
  if (!p) return { error: "Pengajuan tidak ditemukan" };

  const now = new Date();
  await db.transaction(async (tx) => {
    if (accept) {
      await tx
        .insert(attendances)
        .values({ ssbId: ssb.id, sessionId: p.sessionId, playerId: p.playerId, status: p.type, updatedAt: now })
        .onConflictDoUpdate({
          target: [attendances.sessionId, attendances.playerId],
          set: { status: p.type, updatedAt: now },
        });
    }
    await tx.update(parentPermissions).set({ resolvedAt: now }).where(eq(parentPermissions.id, p.id));
  });
  revalidatePath(`/presensi/${p.sessionId}`);
}
