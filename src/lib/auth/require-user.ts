// Satu-satunya pintu "siapa yang memanggil" untuk server action & route handler.
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionValue } from "./session";

// ponytail: satu kode akses bersama untuk semua pelatih (demo satu SSB); naik ke Supabase Auth per pelatih
// saat ada lebih dari satu SSB atau pelatih perlu dibedakan di audit log.
export async function isCoach(): Promise<boolean> {
  return verifySessionValue((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Wajib di baris pertama tiap server action / route handler yang menyentuh data pelatih. */
export async function requireUser(): Promise<{ role: "coach" }> {
  if (!(await isCoach())) throw new Error("Unauthorized");
  return { role: "coach" };
}

/** Versi halaman: alihkan ke /masuk alih-alih melempar error. */
export async function requireCoachPage(): Promise<void> {
  if (!(await isCoach())) redirect("/masuk");
}
