import type { Status } from "@/lib/attendance";

export type QueuedMark = { sessionId: string; playerId: string; status: Status; at: number };

const KEY = "tb-presensi-queue";

// ponytail: antrean di localStorage (sinkron, bertahan saat reload/HP mati) — cukup untuk ±50 tap per sesi;
// pindah ke IndexedDB kalau antrean perlu menampung banyak sesi atau data besar (foto).
export function readQueue(): QueuedMark[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as QueuedMark[];
  } catch {
    return [];
  }
}

function writeQueue(q: QueuedMark[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(q));
  } catch {
    // Penyimpanan penuh/diblokir: tap tetap dikirim langsung, hanya tidak tahan reload.
  }
}

const same = (a: QueuedMark, b: QueuedMark) => a.sessionId === b.sessionId && a.playerId === b.playerId;

/** Simpan tap terbaru per anak per sesi. */
export function enqueue(m: QueuedMark) {
  writeQueue([...readQueue().filter((x) => !same(x, m)), m]);
}

/** Buang tap yang sudah diterima server; tap yang lebih baru (masuk saat kiriman berjalan) tetap tinggal. */
export function acknowledge(sent: QueuedMark[]) {
  writeQueue(readQueue().filter((x) => !sent.some((s) => same(s, x) && s.at === x.at)));
}

export type FlushResult = "ok" | "offline" | "unauthorized" | "error";

export async function sendQueue(): Promise<{ result: FlushResult; left: number }> {
  const q = readQueue();
  if (!q.length) return { result: "ok", left: 0 };
  try {
    const res = await fetch("/api/presensi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marks: q }),
    });
    if (res.status === 401) return { result: "unauthorized", left: q.length };
    if (!res.ok) return { result: "error", left: q.length };
    acknowledge(q);
    return { result: "ok", left: readQueue().length };
  } catch {
    return { result: "offline", left: q.length };
  }
}
