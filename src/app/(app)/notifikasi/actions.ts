"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { notifications, pushSubscriptions } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";

type Result = { ok: true } | { error: string };

export async function subscribePush(input: { endpoint: string; p256dh: string; auth: string; userAgent?: string }): Promise<Result> {
  const { ssbId } = await requireUser();
  const { endpoint, p256dh, auth } = input ?? {};
  const str = (v: unknown, max: number): v is string => typeof v === "string" && v.length > 0 && v.length <= max;
  if (!str(endpoint, 2000) || !/^https:\/\//.test(endpoint) || !str(p256dh, 500) || !str(auth, 500)) {
    return { error: "Langganan tidak valid" };
  }
  const userAgent = typeof input.userAgent === "string" ? input.userAgent.slice(0, 300) : null;
  // Endpoint unik per HP; HP yang sama dipakai klub lain → pindah ke klub ini.
  await db
    .insert(pushSubscriptions)
    .values({ ssbId, endpoint, p256dh, auth, userAgent })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { ssbId, p256dh, auth, userAgent } });
  return { ok: true };
}

export async function unsubscribePush(endpoint: string): Promise<Result> {
  const { ssbId } = await requireUser();
  if (typeof endpoint !== "string" || !endpoint) return { error: "Langganan tidak valid" };
  await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.ssbId, ssbId), eq(pushSubscriptions.endpoint, endpoint)));
  return { ok: true };
}

export async function markAllRead(): Promise<Result> {
  const { ssbId } = await requireUser();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.ssbId, ssbId), isNull(notifications.readAt)));
  revalidatePath("/", "layout");
  return { ok: true };
}
