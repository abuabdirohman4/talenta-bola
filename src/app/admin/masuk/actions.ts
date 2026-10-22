"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { setAdminCookie } from "@/lib/auth/require-user";
import { ADMIN_COOKIE, adminCodeMatches } from "@/lib/auth/session";

// Pintu publik (tercatat di PUBLIC guard.test.ts): masuk & keluar super-admin tidak butuh sesi.
export async function signInAdmin(_: unknown, formData: FormData): Promise<{ error: string } | undefined> {
  if (!adminCodeMatches(String(formData.get("code") ?? ""))) {
    await new Promise((r) => setTimeout(r, 800));
    return { error: "Kode super-admin salah." };
  }
  await setAdminCookie();
  redirect("/admin");
}

export async function signOutAdmin() {
  (await cookies()).delete({ name: ADMIN_COOKIE, path: "/admin" });
  redirect("/admin/masuk");
}
