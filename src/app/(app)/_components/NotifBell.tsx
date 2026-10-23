"use client";

import { Bell } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import { markAllRead } from "../notifikasi/actions";

function Icon() {
  const { pending } = useLinkStatus();
  return pending ? <Spinner size={16} /> : <Bell size={18} aria-hidden />;
}

/** Lonceng top bar: angka = notifikasi klub yang belum dibaca. */
export function NotifBell({ unread, className }: { unread: number; className?: string }) {
  return (
    <Link
      href="/notifikasi"
      aria-label={unread ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"}
      className={cn("relative grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-subtle text-ink hover:bg-ground", className)}
    >
      <Icon />
      {unread > 0 && (
        <span className="absolute -top-1.5 -right-1.5 grid min-w-5 place-items-center rounded-full bg-alpa px-1 text-[10px] leading-5 font-bold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}

export type NotifItem = { id: string; title: string; body: string; url: string | null; createdAt: string; read: boolean };

const fmt = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Desktop: lonceng membuka daftar singkat di tempat; HP tetap ke halaman /notifikasi. */
export function NotifMenu({ unread, items }: { unread: number; items: NotifItem[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"}
        onClick={() => setOpen((o) => !o)}
        className="relative grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-subtle text-ink hover:bg-ground"
      >
        <Bell size={18} aria-hidden />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 grid min-w-5 place-items-center rounded-full bg-alpa px-1 text-[10px] leading-5 font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifikasi" className="absolute top-full right-0 z-50 mt-2 w-96 overflow-hidden rounded-2xl border border-line bg-card shadow-xl">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <p className="text-sm font-bold">Notifikasi</p>
            {unread > 0 && (
              <button
                type="button"
                disabled={pending}
                onClick={() => start(async () => void (await markAllRead()))}
                className="flex min-h-9 items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-60"
              >
                {pending && <Spinner size={12} />} Tandai semua dibaca
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted">Belum ada notifikasi.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-line overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.url ?? "/notifikasi"}
                    onClick={() => setOpen(false)}
                    className={cn("block px-4 py-3 hover:bg-ground", !n.read && "bg-primary-soft/40")}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className={cn("text-sm", n.read ? "font-semibold" : "font-black")}>{n.title}</span>
                      <span className="shrink-0 text-[11px] text-muted">{fmt.format(new Date(n.createdAt))}</span>
                    </span>
                    <span className={cn("mt-0.5 line-clamp-2 block text-sm", n.read ? "text-muted" : "text-ink")}>{n.body}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/notifikasi"
            onClick={() => setOpen(false)}
            className="block border-t border-line px-4 py-3 text-center text-sm font-semibold text-primary hover:bg-ground"
          >
            Lihat semua
          </Link>
        </div>
      )}
    </div>
  );
}
