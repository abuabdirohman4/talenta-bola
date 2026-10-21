"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { ageGroups, ssbProfiles } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { audit, getSsb } from "@/lib/data";
import { normalizePhoneWa } from "@/lib/validation/player";

type Result = { error: string } | undefined;

export async function updateSsb(input: {
  name: string;
  headCoachName: string;
  homeGround: string;
  phoneWa: string;
  primaryColor: string;
  logoUrl: string;
}): Promise<Result> {
  await requireUser();
  const ssb = await getSsb();
  const name = input.name.trim();
  if (!name) return { error: "Nama SSB wajib diisi" };
  if (!/^#[0-9a-f]{6}$/i.test(input.primaryColor)) return { error: "Warna tidak valid" };
  if (input.phoneWa.trim() && !normalizePhoneWa(input.phoneWa)) return { error: "Nomor WA tidak valid" };
  if (input.logoUrl && (!/^data:image\/(jpeg|png|webp);base64,/.test(input.logoUrl) || input.logoUrl.length > 300_000)) {
    return { error: "Logo tidak valid atau terlalu besar" };
  }
  const values = {
    name,
    headCoachName: input.headCoachName.trim() || null,
    homeGround: input.homeGround.trim() || null,
    phoneWa: normalizePhoneWa(input.phoneWa),
    primaryColor: input.primaryColor.toLowerCase(),
    logoUrl: input.logoUrl || null,
  };
  await db.update(ssbProfiles).set({ ...values, updatedAt: new Date() }).where(eq(ssbProfiles.id, ssb.id));
  await audit({ ssbId: ssb.id, action: "update", tableName: "ssb_profiles", recordId: ssb.id, dataAfter: { ...values, logoUrl: values.logoUrl ? "[logo]" : null } });
  revalidatePath("/", "layout");
}

export async function addAgeGroup(input: { name: string; code: string; birthYear: string }): Promise<Result> {
  await requireUser();
  const ssb = await getSsb();
  const name = input.name.trim();
  const code = input.code.trim().toUpperCase();
  const year = input.birthYear.trim() ? Number(input.birthYear) : null;
  if (!name || !code) return { error: "Nama dan kode wajib diisi" };
  if (year !== null && (!Number.isInteger(year) || year < 2000 || year > 2030)) return { error: "Tahun lahir tidak valid" };
  const [dupe] = await db
    .select({ id: ageGroups.id })
    .from(ageGroups)
    .where(and(eq(ageGroups.ssbId, ssb.id), eq(ageGroups.code, code), isNull(ageGroups.deletedAt)));
  if (dupe) return { error: `Kode ${code} sudah dipakai` };
  await db.insert(ageGroups).values({ ssbId: ssb.id, name, code, birthYear: year });
  revalidatePath("/", "layout");
}
