import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { cache } from "react";
import { db } from "@/db";
import { ageGroups, auditLog, ssbProfiles } from "@/db/schema";

// ponytail: satu SSB (baris pertama) untuk demo Galuh Putra; multi-SSB = ssb_id dari sesi pelatih.
export const getSsb = cache(async () => {
  const [ssb] = await db
    .select()
    .from(ssbProfiles)
    .where(isNull(ssbProfiles.deletedAt))
    .orderBy(asc(ssbProfiles.createdAt))
    .limit(1);
  if (!ssb) throw new Error("Belum ada data SSB — jalankan `pnpm db:seed`.");
  return ssb;
});

export const getAgeGroups = cache(async (ssbId: string) =>
  db
    .select()
    .from(ageGroups)
    .where(and(eq(ageGroups.ssbId, ssbId), isNull(ageGroups.deletedAt)))
    .orderBy(asc(ageGroups.sortOrder), asc(ageGroups.code))
);

/** KU aktif dari ?ku=<id>; default KU pertama. */
export async function getActiveGroup(kuParam: string | string[] | undefined) {
  const ssb = await getSsb();
  const groups = await getAgeGroups(ssb.id);
  const group = groups.find((g) => g.id === kuParam) ?? groups[0] ?? null;
  return { ssb, groups, group };
}

/** Token acak 32 karakter untuk link tanpa login (ortu, rapor). */
export const newToken = () => randomBytes(24).toString("base64url");

type AuditEntry = Omit<typeof auditLog.$inferInsert, "id" | "createdAt">;
export async function audit(entry: AuditEntry, tx: Pick<typeof db, "insert"> = db) {
  await tx.insert(auditLog).values(entry);
}

/** Alamat publik app untuk link yang dibagikan via WA — diambil dari host request, jadi ikut domain apa pun. */
export async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
