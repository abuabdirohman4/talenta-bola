"use server";

import { and, eq, isNull, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { ageGroups, players } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { audit, getSsb, newToken } from "@/lib/data";
import { FEET, POSITIONS, toNum, type PlayerFormData } from "@/lib/players";
import { normalizePhoneWa, validatePlayer } from "@/lib/validation/player";
import { parseWaList } from "@/lib/wa-import";

type SaveResult = { ok: true; id: string } | { ok: false; errors: Record<string, string> };

const PHOTO = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export async function savePlayer(input: PlayerFormData): Promise<SaveResult> {
  await requireUser();
  const ssb = await getSsb();

  const [group] = await db
    .select()
    .from(ageGroups)
    .where(and(eq(ageGroups.id, input.ageGroupId), eq(ageGroups.ssbId, ssb.id), isNull(ageGroups.deletedAt)));
  if (!group) return { ok: false, errors: { ageGroupId: "Pilih kelompok umur" } };

  const values = {
    ageGroupId: group.id,
    fullName: input.fullName.trim(),
    nickname: input.nickname.trim() || null,
    birthDate: input.birthDate || null,
    jerseyNumber: toNum(input.jerseyNumber),
    position: POSITIONS.some((p) => p.value === input.position) ? input.position : null,
    preferredFoot: FEET.some((f) => f.value === input.preferredFoot) ? input.preferredFoot : null,
    heightCm: toNum(input.heightCm),
    weightKg: toNum(input.weightKg),
    parentName: input.parentName.trim() || null,
    parentPhoneWa: normalizePhoneWa(input.parentPhoneWa),
    photoUrl: input.photoUrl || null,
    isActive: input.isActive,
  };

  // Validasi di server juga — klien bisa dilewati.
  const v = validatePlayer({ ...values, parentPhoneWa: input.parentPhoneWa, ageGroupBirthYear: group.birthYear });
  if (values.photoUrl && (!PHOTO.test(values.photoUrl) || values.photoUrl.length > 300_000)) {
    v.errors.photoUrl = "Foto tidak valid atau terlalu besar";
  }
  if (Object.keys(v.errors).length) return { ok: false, errors: v.errors };

  if (input.id) {
    const [before] = await db
      .select()
      .from(players)
      .where(and(eq(players.id, input.id), eq(players.ssbId, ssb.id), isNull(players.deletedAt)));
    if (!before) return { ok: false, errors: { fullName: "Pemain tidak ditemukan" } };
    await db
      .update(players)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(players.id, before.id));
    await audit({
      ssbId: ssb.id,
      action: "update",
      tableName: "players",
      recordId: before.id,
      dataBefore: { ...before, photoUrl: before.photoUrl ? "[foto]" : null },
      dataAfter: { ...values, photoUrl: values.photoUrl ? "[foto]" : null },
    });
    revalidatePath("/pemain");
    return { ok: true, id: before.id };
  }

  const [{ last }] = await db
    .select({ last: max(players.sortOrder) })
    .from(players)
    .where(eq(players.ageGroupId, group.id));
  const [created] = await db
    .insert(players)
    .values({ ...values, ssbId: ssb.id, sortOrder: (last ?? 0) + 1, parentToken: newToken() })
    .returning({ id: players.id });
  await audit({ ssbId: ssb.id, action: "create", tableName: "players", recordId: created!.id, dataAfter: { fullName: values.fullName } });
  revalidatePath("/pemain");
  return { ok: true, id: created!.id };
}

/** Hapus lunak: riwayat presensi & rapor tetap utuh. */
export async function deletePlayer(id: string): Promise<{ error: string } | undefined> {
  await requireUser();
  const ssb = await getSsb();
  const [p] = await db
    .update(players)
    .set({ deletedAt: new Date(), isActive: false })
    .where(and(eq(players.id, id), eq(players.ssbId, ssb.id), isNull(players.deletedAt)))
    .returning({ id: players.id, fullName: players.fullName });
  if (!p) return { error: "Pemain tidak ditemukan" };
  await audit({ ssbId: ssb.id, action: "delete", tableName: "players", recordId: p.id, dataBefore: { fullName: p.fullName } });
  revalidatePath("/pemain");
}

/** Buat link ortu baru; link lama langsung tidak berlaku (mis. tersebar ke grup yang salah). */
export async function regenerateParentToken(id: string): Promise<{ token?: string; error?: string }> {
  await requireUser();
  const ssb = await getSsb();
  const token = newToken();
  const [p] = await db
    .update(players)
    .set({ parentToken: token, updatedAt: new Date() })
    .where(and(eq(players.id, id), eq(players.ssbId, ssb.id)))
    .returning({ id: players.id });
  if (!p) return { error: "Pemain tidak ditemukan" };
  await audit({ ssbId: ssb.id, action: "update", tableName: "players", recordId: p.id, dataAfter: { parentToken: "diganti" } });
  revalidatePath(`/pemain/${id}`);
  return { token };
}

/** Impor nama dari daftar presensi WA. Nama yang sudah ada di KU itu dilewati. */
export async function importPlayers(ageGroupId: string, text: string): Promise<{ added: string[]; skipped: string[]; error?: string }> {
  await requireUser();
  const ssb = await getSsb();
  const [group] = await db
    .select()
    .from(ageGroups)
    .where(and(eq(ageGroups.id, ageGroupId), eq(ageGroups.ssbId, ssb.id), isNull(ageGroups.deletedAt)));
  if (!group) return { added: [], skipped: [], error: "Kelompok umur tidak ditemukan" };

  const parsed = parseWaList(text).slice(0, 200);
  const existing = await db
    .select({ fullName: players.fullName, sortOrder: players.sortOrder })
    .from(players)
    .where(and(eq(players.ageGroupId, group.id), isNull(players.deletedAt)));
  const have = new Set(existing.map((p) => p.fullName.toLowerCase()));
  const fresh = parsed.filter((p) => !have.has(p.fullName.toLowerCase()));
  const start = Math.max(0, ...existing.map((p) => p.sortOrder));

  if (fresh.length) {
    await db.insert(players).values(
      fresh.map((p, i) => ({
        ssbId: ssb.id,
        ageGroupId: group.id,
        fullName: p.fullName,
        nickname: p.nickname,
        sortOrder: start + i + 1,
        parentToken: newToken(),
      }))
    );
    await audit({ ssbId: ssb.id, action: "import", tableName: "players", dataAfter: { names: fresh.map((p) => p.fullName) } });
  }
  revalidatePath("/pemain");
  return {
    added: fresh.map((p) => p.fullName),
    skipped: parsed.filter((p) => have.has(p.fullName.toLowerCase())).map((p) => p.fullName),
  };
}
