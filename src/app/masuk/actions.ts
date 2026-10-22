"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findSsbByCode } from "@/lib/auth/access-code";
import { setCoachCookie } from "@/lib/auth/require-user";
import { SESSION_COOKIE } from "@/lib/auth/session";

// Pintu publik (tercatat di PUBLIC guard.test.ts): masuk & keluar tidak butuh sesi.
export async function signIn(_: unknown, formData: FormData): Promise<{ error: string } | undefined> {
  const ssb = await findSsbByCode(String(formData.get("code") ?? ""));
  if (!ssb) {
    // Perlambat tebakan beruntun.
    await new Promise((r) => setTimeout(r, 800));
    return { error: "Kode akses salah. Tanyakan ke pengurus SSB." };
  }
  await setCoachCookie(ssb.id, ssb.version);
  redirect("/");
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/masuk");
}
