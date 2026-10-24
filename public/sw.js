// Service worker manual (tanpa next-pwa). Naikkan BUILD_VERSION tiap deploy berarti → cache lama dibuang.
const BUILD_VERSION = "2026-10-24.2";
const CACHE = `talenta-bola-${BUILD_VERSION}`;
// Cache "talenta-bola-pages" diisi halaman presensi sendiri (salinan offline); ikut dibuang saat versi berganti.

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // Hanya GET same-origin. POST presensi punya antrean offline sendiri di halaman (localStorage).
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;

  // Aset build berversi: cache-first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
      )
    );
    return;
  }

  // Halaman: network-first, jatuh ke salinan terakhir saat sinyal hilang (presensi tetap bisa dibuka di lapangan).
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then(
            (hit) =>
              hit ||
              new Response(
                "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'>" +
                  "<body style='font-family:sans-serif;padding:24px'><h1>Tidak ada sinyal</h1>" +
                  "<p>Halaman ini belum pernah dibuka saat online. Coba lagi saat ada sinyal.</p>",
                { headers: { "Content-Type": "text/html; charset=utf-8" } }
              )
          )
        )
    );
  }
});

// Web Push: payload JSON {title, body, url, tag} dari src/lib/server/notify.ts.
self.addEventListener("push", (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch {
    d = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(d.title || "TalentaBola", {
      body: d.body || "",
      icon: "/icons/icon-192.png",
      tag: d.tag || undefined,
      data: { url: d.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const c = clients.find((x) => "focus" in x);
      if (c) {
        if ("navigate" in c) c.navigate(url);
        return c.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
