"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { accessCodeMatches, createSessionValue, SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth/session";

// Pintu publik (tercatat di PUBLIC guard.test.ts): masuk & keluar tidak butuh sesi.
export async function signIn(_: unknown, formData: FormData): Promise<{ error: string } | undefined> {
  const code = String(formData.get("code") ?? "");
  if (!accessCodeMatches(code)) {
    // Perlambat tebakan beruntun.
    await new Promise((r) => setTimeout(r, 800));
    return { error: "Kode akses salah. Tanyakan ke pengurus SSB." };
  }
  (await cookies()).set(SESSION_COOKIE, createSessionValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  redirect("/");
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/masuk");
}
