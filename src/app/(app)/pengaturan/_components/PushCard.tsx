"use client";

import { Bell, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { subscribePush, unsubscribePush } from "@/app/(app)/notifikasi/actions";
import { Button } from "@/components/ui/Button";

type State = "loading" | "unsupported" | "ios-install" | "denied" | "on" | "off";

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function keyToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const raw = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const registration = () => navigator.serviceWorker.register("/sw.js").then(() => navigator.serviceWorker.ready);

/** Aktif/matikan notifikasi untuk HP ini; langganan disimpan per HP, bukan per akun. */
export function PushCard() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
      // iPhone hanya mengenal push setelah app dipasang ke layar utama.
      if (ios && !standalone) return setState("ios-install");
      if (!VAPID_KEY || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState("unsupported");
      if (Notification.permission === "denied") return setState("denied");
      try {
        const sub = await (await registration()).pushManager.getSubscription();
        setState(sub ? "on" : "off");
      } catch {
        setState("unsupported");
      }
    })();
  }, []);

  const enable = async () => {
    setBusy(true);
    try {
      if ((await Notification.requestPermission()) !== "granted") {
        setState(Notification.permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await registration();
      await (await reg.pushManager.getSubscription())?.unsubscribe(); // langganan lama dengan kunci VAPID lain menghalangi subscribe()
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(VAPID_KEY!) });
      const j = sub.toJSON();
      const r = await subscribePush({ endpoint: j.endpoint!, p256dh: j.keys!.p256dh, auth: j.keys!.auth, userAgent: navigator.userAgent });
      if ("error" in r) {
        await sub.unsubscribe();
        return void toast.error(r.error);
      }
      setState("on");
      toast.success("Notifikasi aktif di HP ini");
    } catch {
      toast.error("Gagal mengaktifkan notifikasi. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const sub = await (await registration()).pushManager.getSubscription();
      if (sub) {
        await unsubscribePush(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      toast.error("Gagal mematikan notifikasi. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-4 flex items-start gap-3 rounded-2xl border border-line bg-card p-4 shadow-sm">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
        <Bell size={20} aria-hidden />
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="font-bold text-ink">Notifikasi di HP ini</p>
          <p className="text-sm text-muted">Dapat kabar langsung saat orang tua mengirim izin atau sakit.</p>
        </div>
        {state === "on" && (
          <>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-hadir">
              <Check size={16} aria-hidden /> Aktif di HP ini
            </p>
            <Button variant="outline" loading={busy} onClick={disable}>
              Matikan
            </Button>
          </>
        )}
        {state === "off" && (
          <Button loading={busy} onClick={enable}>
            Aktifkan
          </Button>
        )}
        {state === "loading" && <p className="text-sm text-muted">Memeriksa…</p>}
        {state === "ios-install" && (
          <p className="text-sm text-ink">Di iPhone, notifikasi hanya bisa dipakai setelah aplikasi dipasang ke layar utama. Pasang dulu (kartu di atas), lalu buka dari layar utama.</p>
        )}
        {state === "denied" && (
          <p className="text-sm text-ink">Notifikasi diblokir di browser. Buka pengaturan situs di browser, izinkan notifikasi untuk situs ini, lalu muat ulang halaman.</p>
        )}
        {state === "unsupported" && <p className="text-sm text-muted">Browser atau server ini belum mendukung notifikasi.</p>}
      </div>
    </section>
  );
}
