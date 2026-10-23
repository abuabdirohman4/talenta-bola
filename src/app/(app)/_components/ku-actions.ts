"use server";

import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/require-user";
import { getAgeGroups, getSsb } from "@/lib/data";

/** Simpan KU aktif supaya semua halaman memakai kelompok umur yang sama. */
export async function setActiveKu(ageGroupId: string): Promise<void> {
  await requireUser();
  const ssb = await getSsb();
  if (!(await getAgeGroups(ssb.id)).some((g) => g.id === ageGroupId)) return;
  (await cookies()).set("tb_ku", ageGroupId, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
