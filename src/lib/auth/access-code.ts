import "server-only";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { ssbProfiles } from "@/db/schema";
import { hashAccessCode, MIN_CODE, normalizeCode } from "./session";

export const CODE_TAKEN = "Kode ini sudah dipakai klub lain";

export function validateAccessCode(code: string): string | null {
  return normalizeCode(code).length < MIN_CODE ? `Kode akses minimal ${MIN_CODE} karakter` : null;
}

/** Cari SSB aktif pemilik kode (hash deterministik → satu lookup indeks). */
export async function findSsbByCode(code: string) {
  if (validateAccessCode(code)) return null;
  const [ssb] = await db
    .select({ id: ssbProfiles.id, version: ssbProfiles.accessCodeVersion })
    .from(ssbProfiles)
    .where(and(eq(ssbProfiles.accessCodeHash, hashAccessCode(code)), isNull(ssbProfiles.deletedAt)));
  return ssb ?? null;
}

/** Bentrok unique index kode akses (dua klub tidak boleh berbagi kode). Drizzle membungkus error postgres di `cause`. */
export function isCodeConflict(e: unknown): boolean {
  const err = (e as { cause?: unknown })?.cause ?? e;
  const { code, constraint_name } = (err ?? {}) as { code?: string; constraint_name?: string };
  return code === "23505" && constraint_name === "ssb_profiles_access_code_active_unique";
}

/** Set kode baru + naikkan versi (semua sesi lama gugur). Kembalikan versi baru, atau pesan error. */
export async function saveAccessCode(ssbId: string, code: string): Promise<{ error: string } | { version: number }> {
  const invalid = validateAccessCode(code);
  if (invalid) return { error: invalid };
  const hash = hashAccessCode(code);
  const [taken] = await db
    .select({ id: ssbProfiles.id })
    .from(ssbProfiles)
    .where(and(eq(ssbProfiles.accessCodeHash, hash), ne(ssbProfiles.id, ssbId), isNull(ssbProfiles.deletedAt)));
  if (taken) return { error: CODE_TAKEN };
  try {
    const [row] = await db
      .update(ssbProfiles)
      .set({ accessCodeHash: hash, accessCodeVersion: sql`${ssbProfiles.accessCodeVersion} + 1`, updatedAt: new Date() })
      .where(and(eq(ssbProfiles.id, ssbId), isNull(ssbProfiles.deletedAt)))
      .returning({ version: ssbProfiles.accessCodeVersion });
    return row ? { version: row.version } : { error: "SSB tidak ditemukan" };
  } catch (e) {
    if (isCodeConflict(e)) return { error: CODE_TAKEN };
    throw e;
  }
}
