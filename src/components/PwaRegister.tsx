"use client";

import { useEffect } from "react";

const SKEW_KEY = "tb-skew-reload-at";

export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    // Deploy baru membuat chunk lama hilang → muat ulang sekali (dijaga 60 detik supaya tidak berputar).
    const onError = (e: ErrorEvent | PromiseRejectionEvent) => {
      const msg = String("reason" in e ? e.reason?.message ?? e.reason : e.message);
      if (!/ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/.test(msg)) return;
      const last = Number(sessionStorage.getItem(SKEW_KEY) ?? 0);
      if (Date.now() - last < 60_000) return;
      sessionStorage.setItem(SKEW_KEY, String(Date.now()));
      location.reload();
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onError);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onError);
    };
  }, []);
  return null;
}
