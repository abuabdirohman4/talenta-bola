import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getSsb } from "@/lib/data";
import { cn } from "@/lib/utils";
import { MarkAllReadButton } from "./_components/MarkAllReadButton";

export const metadata: Metadata = { title: "Notifikasi" };

const fmt = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function NotifikasiPage() {
  const ssb = await getSsb();
  const items = await db
    .select()
    .from(notifications)
    .where(eq(notifications.ssbId, ssb.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Klub</p>
          <h2 className="text-xl font-black tracking-tight md:hidden">Notifikasi</h2>
        </div>
        {unread > 0 && <MarkAllReadButton />}
      </div>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-line bg-card p-6 text-center text-sm text-muted shadow-sm">
          Belum ada notifikasi. Izin dari orang tua akan muncul di sini. Aktifkan notifikasi HP di Pengaturan supaya langsung berbunyi.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
          {items.map((n) => {
            const body = (
              <>
                <span className="flex items-start justify-between gap-3">
                  <span className={cn("text-sm", n.readAt ? "font-semibold" : "font-black")}>{n.title}</span>
                  <span className="shrink-0 text-[11px] text-muted">{fmt.format(n.createdAt)}</span>
                </span>
                <span className={cn("mt-0.5 block text-sm", n.readAt ? "text-muted" : "text-ink")}>{n.body}</span>
              </>
            );
            const cls = cn("block min-h-14 px-4 py-3", !n.readAt && "bg-primary-soft/40");
            return (
              <li key={n.id}>
                {n.url ? (
                  <Link href={n.url} className={cn(cls, "hover:bg-ground")}>
                    {body}
                  </Link>
                ) : (
                  <div className={cls}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
