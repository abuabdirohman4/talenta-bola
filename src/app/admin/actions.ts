"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { ageGroups, ssbProfiles } from "@/db/schema";
import { CODE_TAKEN, isCodeConflict, saveAccessCode, validateAccessCode } from "@/lib/auth/access-code";
import { requireAdmin } from "@/lib/auth/require-user";
import { hashAccessCode } from "@/lib/auth/session";
import { audit } from "@/lib/data";

type Result = { error: string } | undefined;

export async function createSsb(input: {
  name: string;
  slug: string;
  kuCode: string;
  kuName: string;
  birthYear: string;
  primaryColor: string;
  code: string;
}): Promise<Result> {
  await requireAdmin();
  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();
  const kuCode = input.kuCode.trim().toUpperCase();
  const kuName = input.kuName.trim();
  const year = input.birthYear.trim() ? Number(input.birthYear) : null;
  if (!name) return { error: "Nama SSB wajib diisi" };
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return { error: "Slug hanya huruf kecil, angka, dan tanda minus (mis. galuh-putra)" };
  if (!kuCode || !kuName) return { error: "Kode dan nama KU pertama wajib diisi" };
  if (year !== null && (!Number.isInteger(year) || year < 2000 || year > 2030)) return { error: "Tahun lahir tidak valid" };
  if (!/^#[0-9a-f]{6}$/i.test(input.primaryColor)) return { error: "Warna tidak valid" };
  const invalid = validateAccessCode(input.code);
  if (invalid) return { error: invalid };
  const hash = hashAccessCode(input.code);

  const [slugTaken] = await db
    .select({ id: ssbProfiles.id })
    .from(ssbProfiles)
    .where(and(eq(ssbProfiles.slug, slug), isNull(ssbProfiles.deletedAt)));
  if (slugTaken) return { error: `Slug ${slug} sudah dipakai` };
  const [codeTaken] = await db
    .select({ id: ssbProfiles.id })
    .from(ssbProfiles)
    .where(and(eq(ssbProfiles.accessCodeHash, hash), isNull(ssbProfiles.deletedAt)));
  if (codeTaken) return { error: CODE_TAKEN };

  try {
    await db.transaction(async (tx) => {
      const [ssb] = await tx
        .insert(ssbProfiles)
        .values({ name, slug, primaryColor: input.primaryColor.toLowerCase(), accessCodeHash: hash })
        .returning({ id: ssbProfiles.id });
      await tx.insert(ageGroups).values({ ssbId: ssb!.id, code: kuCode, name: kuName, birthYear: year });
      await audit({ ssbId: ssb!.id, action: "create", tableName: "ssb_profiles", recordId: ssb!.id, dataAfter: { name, slug, by: "super-admin" } }, tx);
    });
  } catch (e) {
    if (isCodeConflict(e)) return { error: CODE_TAKEN };
    throw e;
  }
  revalidatePath("/admin");
}

export async function resetSsbCode(input: { ssbId: string; code: string }): Promise<Result> {
  await requireAdmin();
  const r = await saveAccessCode(input.ssbId, input.code);
  if ("error" in r) return r;
  await audit({ ssbId: input.ssbId, action: "update", tableName: "ssb_profiles", recordId: input.ssbId, dataAfter: { accessCodeVersion: r.version, by: "super-admin" } });
  revalidatePath("/admin");
}

/** Soft delete: semua sesi pelatih, link ortu, dan link rapor klub ini ikut mati (dicek deleted_at). */
export async function deleteSsb(input: { ssbId: string }): Promise<Result> {
  await requireAdmin();
  const [row] = await db
    .update(ssbProfiles)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(ssbProfiles.id, input.ssbId), isNull(ssbProfiles.deletedAt)))
    .returning({ id: ssbProfiles.id });
  if (!row) return { error: "SSB tidak ditemukan" };
  await audit({ ssbId: row.id, action: "delete", tableName: "ssb_profiles", recordId: row.id, dataAfter: { by: "super-admin" } });
  revalidatePath("/admin");
}
