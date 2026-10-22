"use server";

import { and, eq, gt, isNull, notInArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { ageGroups, attendances, parentPermissions, trainingPatterns, trainingSessions } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { getSsb } from "@/lib/data";
import { dateWib } from "@/lib/format";
import { fillSessionsFromPatterns } from "@/lib/queries";

type Result = { error: string } | undefined;

/** Sesi mendatang hasil pola ini yang belum disentuh siapa pun (belum libur, tanpa presensi, tanpa izin ortu) dihapus supaya bisa dibuat ulang. */
async function dropUntouchedSessions(ssbId: string, patternId: string) {
  // ponytail: sesi yang sudah punya izin ortu tetap memakai jam/lokasi lama; pelatih mengubahnya lewat Atur sesi.
  await db
    .update(trainingSessions)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(trainingSessions.ssbId, ssbId),
        eq(trainingSessions.patternId, patternId),
        eq(trainingSessions.status, "SCHEDULED"),
        isNull(trainingSessions.deletedAt),
        gt(trainingSessions.sessionDate, dateWib()),
        notInArray(trainingSessions.id, db.select({ id: attendances.sessionId }).from(attendances)),
        notInArray(trainingSessions.id, db.select({ id: parentPermissions.sessionId }).from(parentPermissions))
      )
    );
}

export async function savePattern(input: {
  id?: string;
  ageGroupId: string;
  weekday: number;
  startTime: string;
  location: string;
  topic: string;
}): Promise<Result> {
  await requireUser();
  const ssb = await getSsb();
  const [group] = await db
    .select({ id: ageGroups.id })
    .from(ageGroups)
    .where(and(eq(ageGroups.id, input.ageGroupId), eq(ageGroups.ssbId, ssb.id), isNull(ageGroups.deletedAt)));
  if (!group) return { error: "Kelompok umur tidak ditemukan" };
  if (!Number.isInteger(input.weekday) || input.weekday < 0 || input.weekday > 6) return { error: "Pilih hari latihan" };
  if (!/^\d{2}:\d{2}$/.test(input.startTime)) return { error: "Jam tidak valid" };

  const values = {
    weekday: input.weekday,
    startTime: input.startTime,
    location: input.location.trim() || null,
    topic: input.topic.trim().slice(0, 120) || null,
  };
  // Satu jadwal rutin per hari per KU (sesi juga satu per tanggal).
  const [clash] = await db
    .select({ id: trainingPatterns.id })
    .from(trainingPatterns)
    .where(
      and(
        eq(trainingPatterns.ageGroupId, group.id),
        eq(trainingPatterns.weekday, input.weekday),
        isNull(trainingPatterns.deletedAt)
      )
    );
  if (clash && clash.id !== input.id) return { error: "Hari itu sudah punya jadwal rutin — ubah yang ada." };

  if (input.id) {
    const updated = await db
      .update(trainingPatterns)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(trainingPatterns.id, input.id), eq(trainingPatterns.ssbId, ssb.id), isNull(trainingPatterns.deletedAt)))
      .returning({ id: trainingPatterns.id });
    if (!updated.length) return { error: "Jadwal rutin tidak ditemukan" };
    await dropUntouchedSessions(ssb.id, input.id);
  } else {
    await db.insert(trainingPatterns).values({ ...values, ssbId: ssb.id, ageGroupId: group.id });
  }
  await fillSessionsFromPatterns(ssb.id, group.id, ssb.homeGround);
  revalidatePath("/jadwal");
}

export async function deletePattern(id: string): Promise<Result> {
  await requireUser();
  const ssb = await getSsb();
  const deleted = await db
    .update(trainingPatterns)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(trainingPatterns.id, id), eq(trainingPatterns.ssbId, ssb.id), isNull(trainingPatterns.deletedAt)))
    .returning({ id: trainingPatterns.id });
  if (!deleted.length) return { error: "Jadwal rutin tidak ditemukan" };
  await dropUntouchedSessions(ssb.id, id);
  revalidatePath("/jadwal");
}
