"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { ageGroups, attendances, parentPermissions, trainingSessions } from "@/db/schema";
import { NOTE_MAX } from "@/lib/attendance";
import { requireUser } from "@/lib/auth/require-user";
import { getSsb } from "@/lib/data";
import { dateWib } from "@/lib/format";

type Result = { error: string } | undefined;

async function ownGroup(ssbId: string, ageGroupId: string) {
  const [g] = await db
    .select({ id: ageGroups.id })
    .from(ageGroups)
    .where(and(eq(ageGroups.id, ageGroupId), eq(ageGroups.ssbId, ssbId), isNull(ageGroups.deletedAt)));
  return g;
}

/** Buka sesi untuk tanggal itu; kalau sudah ada, pakai yang ada (satu sesi per KU per hari). `stay` = dari halaman jadwal, tidak pindah ke lembar presensi. */
export async function openSession(input: {
  ageGroupId: string;
  date?: string;
  startTime?: string;
  location?: string;
  topic?: string;
  stay?: boolean;
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
  if (existing && input.stay) return { error: "Tanggal itu sudah punya sesi — ubah lewat Atur sesi." };
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
        topic: input.topic?.trim().slice(0, 120) || null,
      })
      .returning({ id: trainingSessions.id });
    id = s!.id;
  }
  revalidatePath("/presensi");
  revalidatePath("/jadwal");
  if (input.stay) return;
  redirect(`/presensi/${id}`);
}

/** Libur (hujan/lapangan dipakai): sesi tetap ada sebagai riwayat, ortu melihat alasannya dan tidak bisa izin lagi. */
export async function setSessionCancelled(sessionId: string, cancelled: boolean, reason?: string): Promise<void> {
  await requireUser();
  const ssb = await getSsb();
  await db
    .update(trainingSessions)
    .set({
      status: cancelled ? "CANCELLED" : "SCHEDULED",
      cancelReason: cancelled ? reason?.trim().slice(0, 200) || null : null,
      updatedAt: new Date(),
    })
    .where(and(eq(trainingSessions.id, sessionId), eq(trainingSessions.ssbId, ssb.id)));
  revalidatePath("/presensi");
  revalidatePath("/jadwal");
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
  revalidatePath("/jadwal");
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
      // Alasan ortu ikut jadi catatan izin (rekap WA & riwayat ortu); sakit tanpa catatan.
      const note = p.type === "IZIN" ? p.reason.slice(0, NOTE_MAX) : null;
      await tx
        .insert(attendances)
        .values({ ssbId: ssb.id, sessionId: p.sessionId, playerId: p.playerId, status: p.type, note, updatedAt: now })
        .onConflictDoUpdate({
          target: [attendances.sessionId, attendances.playerId],
          set: { status: p.type, note, updatedAt: now },
        });
    }
    await tx.update(parentPermissions).set({ resolvedAt: now }).where(eq(parentPermissions.id, p.id));
  });
  revalidatePath(`/presensi/${p.sessionId}`);
}
