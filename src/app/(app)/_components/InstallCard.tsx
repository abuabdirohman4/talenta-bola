"use client";

import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

const DISMISS_KEY = "tb-install-dismissed";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Ajak pelatih memasang app ke layar utama: tombol Pasang (Android/Chrome) atau panduan Bagikan (iPhone). */
export function InstallCard() {
  const [mode, setMode] = useState<"android" | "ios" | null>(null);
  const [evt, setEvt] = useState<InstallEvent | null>(null);

  useEffect(() => {
    const standalone =
      matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {}
    if (standalone || dismissed) return;

    // iPhone/iPad tidak punya prompt pasang; Safari iPadOS mengaku Mac, jadi cek layar sentuh juga.
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
    if (ios) setMode("ios");

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallEvent);
      setMode("android");
    };
    const onInstalled = () => setMode(null);
    addEventListener("beforeinstallprompt", onPrompt);
    addEventListener("appinstalled", onInstalled);
    return () => {
      removeEventListener("beforeinstallprompt", onPrompt);
      removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!mode) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setMode(null);
  };

  return (
    <section className="relative flex items-start gap-3 rounded-2xl border border-line bg-card p-4 pr-12 shadow-sm">
      <img src="/icons/icon-192.png" alt="" className="size-11 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="font-bold text-ink">Pasang TalentaBola di HP</p>
          <p className="text-sm text-muted">Buka langsung dari layar utama seperti aplikasi, tanpa mengetik alamat.</p>
        </div>
        {mode === "android" ? (
          <Button
            onClick={async () => {
              await evt?.prompt();
              const choice = await evt?.userChoice;
              if (choice?.outcome === "accepted") setMode(null);
            }}
          >
            <Download size={18} aria-hidden /> Pasang
          </Button>
        ) : (
          <p className="text-sm text-ink">
            Di Safari, ketuk <Share size={16} className="inline align-text-bottom text-info" aria-label="Bagikan" /> lalu
            pilih <b>Tambah ke Layar Utama</b>.
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Tutup"
        className="absolute top-2 right-2 grid size-10 place-items-center rounded-xl text-muted hover:bg-ground"
      >
        <X size={18} aria-hidden />
      </button>
    </section>
  );
}
