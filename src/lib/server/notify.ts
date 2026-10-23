import "server-only";
import { eq, inArray } from "drizzle-orm";
import webpush from "web-push";
import { db } from "@/db";
import { notifications, pushSubscriptions } from "@/db/schema";

let configured: boolean | null = null;
function vapidReady(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (configured = false);
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", pub, priv);
  return (configured = true);
}

export type NotifyInput = { kind: string; title: string; body: string; url?: string; dedupeKey?: string };

/** Simpan notifikasi klub (dedupe) lalu push ke semua HP klub itu; endpoint mati (404/410) dibuang. Tidak pernah throw. */
export async function notifySsb(ssbId: string, n: NotifyInput): Promise<void> {
  try {
    const [row] = await db
      .insert(notifications)
      .values({ ssbId, kind: n.kind, title: n.title, body: n.body, url: n.url ?? null, dedupeKey: n.dedupeKey ?? null })
      .onConflictDoNothing()
      .returning({ id: notifications.id });
    if (!row || !vapidReady()) return; // duplikat, atau VAPID belum diisi

    const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.ssbId, ssbId));
    if (!subs.length) return;
    const payload = JSON.stringify({ title: n.title, body: n.body, url: n.url ?? "/", tag: n.dedupeKey });
    const results = await Promise.allSettled(
      subs.map((s) => webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600 }))
    );
    const dead = subs.filter((_, i) => {
      const r = results[i];
      const code = r.status === "rejected" ? (r.reason as { statusCode?: number })?.statusCode : 0;
      return code === 404 || code === 410;
    });
    if (dead.length) {
      await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, dead.map((d) => d.id)));
    }
  } catch (e) {
    console.error("[notify] gagal", e);
  }
}
