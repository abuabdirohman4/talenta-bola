// Satu-satunya pintu "siapa yang memanggil" untuk server action & route handler.
import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { ssbProfiles } from "@/db/schema";
import { ADMIN_COOKIE, ADMIN_HOURS, createAdminValue, createSessionValue, SESSION_COOKIE, SESSION_DAYS, verifyAdminValue, verifySessionValue } from "./session";

// ponytail: satu kode akses per SSB (semua pelatih klub berbagi); naik ke akun per pelatih kalau audit log perlu membedakan pelatih.
/** SSB milik sesi pelatih ini, atau null kalau cookie palsu/kedaluwarsa, SSB terhapus, atau kode sudah diganti (versi beda). */
export const getSessionSsb = cache(async () => {
  const s = verifySessionValue((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const [ssb] = await db
    .select()
    .from(ssbProfiles)
    .where(and(eq(ssbProfiles.id, s.ssbId), eq(ssbProfiles.accessCodeVersion, s.version), isNull(ssbProfiles.deletedAt)));
  return ssb ?? null;
});

export async function isCoach(): Promise<boolean> {
  return !!(await getSessionSsb());
}

/** Wajib di baris pertama tiap server action / route handler yang menyentuh data pelatih. */
export async function requireUser(): Promise<{ role: "coach"; ssbId: string }> {
  const ssb = await getSessionSsb();
  if (!ssb) throw new Error("Unauthorized");
  return { role: "coach", ssbId: ssb.id };
}

/** Versi halaman: alihkan ke /masuk alih-alih melempar error. */
export async function requireCoachPage(): Promise<void> {
  if (!(await getSessionSsb())) redirect("/masuk");
}

/** Tulis cookie pelatih (masuk, atau setelah ganti kode supaya HP ini tetap masuk). */
export async function setCoachCookie(ssbId: string, version: number) {
  (await cookies()).set(SESSION_COOKIE, createSessionValue({ ssbId, version }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

// --- Super-admin (pemilik produk): cookie & kode terpisah dari pelatih. ---

export async function isAdmin(): Promise<boolean> {
  return verifyAdminValue((await cookies()).get(ADMIN_COOKIE)?.value);
}

/** Wajib di baris pertama tiap server action di app/admin. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error("Unauthorized");
}

export async function requireAdminPage(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/masuk");
}

export async function setAdminCookie() {
  (await cookies()).set(ADMIN_COOKIE, createAdminValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    maxAge: ADMIN_HOURS * 3600,
  });
}
