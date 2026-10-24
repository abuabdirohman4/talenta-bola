"use client";

import { Check, Download, Share } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "tb-install-dismissed";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

// Chrome mengirim tawaran pasang sekali per muat halaman; ditangkap di tingkat modul supaya tidak hilang saat pindah halaman.
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    listeners.forEach((f) => f());
  });
  addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((f) => f());
  });
}

type Mode = "installed" | "prompt" | "ios" | "manual";

function detect(): Mode {
  const standalone =
    matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
  if (standalone) return "installed";
  if (deferred) return "prompt";
  // Safari iPadOS mengaku Mac, jadi cek layar sentuh juga.
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  return "manual";
}

/**
 * Ajakan memasang app ke layar utama.
 * "home": kartu di beranda, bisa ditutup, hanya muncul kalau bisa dipasang. "settings": selalu tampil di Pengaturan.
 */
export function InstallCard({ variant = "home" }: { variant?: "home" | "settings" }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [hidden, setHidden] = useState(variant === "home");

  useEffect(() => {
    const update = () => setMode(detect());
    update();
    if (variant === "home") {
      try {
        setHidden(localStorage.getItem(DISMISS_KEY) === "1");
      } catch {
        setHidden(false);
      }
    }
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, [variant]);

  if (!mode || hidden) return null;
  if (variant === "home" && (mode === "installed" || mode === "manual")) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setHidden(true);
  };
  const install = async () => {
    const e = deferred;
    if (!e) return;
    await e.prompt();
    const choice = await e.userChoice;
    deferred = null;
    setMode(choice.outcome === "accepted" ? "installed" : detect());
  };

  // Beranda: popup kecil melayang (pola Better Planner), tidak memakan tempat konten.
  if (variant === "home") {
    return (
      <div
        role="dialog"
        aria-label="Install aplikasi"
        className="no-print fixed top-20 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl border border-line bg-card p-4 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <img src="/icons/icon-192.png" alt="" className="size-11 shrink-0 rounded-xl" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink">Install TalentaBola</p>
            <p className="text-xs text-muted">
              {mode === "ios" ? (
                <>
                  Ketuk <Share size={13} className="inline align-text-bottom text-info" aria-label="Bagikan" /> lalu <b>Tambah ke Layar Utama</b>.
                </>
              ) : (
                "Buka dari layar utama, lebih cepat."
              )}
            </p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          {mode === "prompt" && (
            <button type="button" onClick={install} className="min-h-11 flex-1 rounded-lg bg-primary text-sm font-semibold text-white hover:opacity-90">
              Install
            </button>
          )}
          <button type="button" onClick={dismiss} className="min-h-11 flex-1 rounded-lg bg-ground text-sm font-semibold text-ink hover:bg-line">
            {mode === "ios" ? "Mengerti" : "Nanti"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <section
      className={cn(
        "relative flex items-start gap-3 rounded-2xl border border-line bg-card p-4 shadow-sm",
        variant === "settings" && "mt-4"
      )}
    >
      <img src="/icons/icon-192.png" alt="" className="size-11 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="font-bold text-ink">Install aplikasi</p>
          <p className="text-sm text-muted">Buka langsung dari layar utama seperti aplikasi, tanpa mengetik alamat.</p>
        </div>
        {mode === "installed" ? (
          <p className="flex items-center gap-1.5 text-sm font-semibold text-hadir">
            <Check size={16} aria-hidden /> Sudah terpasang di perangkat ini
          </p>
        ) : mode === "prompt" ? (
          <Button onClick={install}>
            <Download size={18} aria-hidden /> Install
          </Button>
        ) : mode === "ios" ? (
          <p className="text-sm text-ink">
            Di Safari, ketuk <Share size={16} className="inline align-text-bottom text-info" aria-label="Bagikan" /> lalu pilih{" "}
            <b>Tambah ke Layar Utama</b>.
          </p>
        ) : (
          <p className="text-sm text-ink">
            Buka di Chrome, ketuk menu <b>⋮</b> lalu pilih <b>Tambahkan ke layar utama</b> atau <b>Instal aplikasi</b>. Kalau
            dibuka dari WhatsApp, pilih dulu &quot;Buka di Chrome&quot;.
          </p>
        )}
      </div>
    </section>
  );
}
