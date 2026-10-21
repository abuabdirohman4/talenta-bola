import { beforeEach, describe, expect, it, vi } from "vitest";
import { acknowledge, enqueue, readQueue, sendQueue } from "@/app/(app)/presensi/[id]/_components/offline-queue";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
});

const m = (playerId: string, status: "HADIR" | "IZIN", at: number) => ({ sessionId: "s1", playerId, status, at });

describe("antrean presensi offline", () => {
  beforeEach(() => store.clear());

  it("menyimpan hanya tap terakhir per anak", () => {
    enqueue(m("a", "HADIR", 1));
    enqueue(m("a", "IZIN", 2));
    enqueue(m("b", "HADIR", 3));
    expect(readQueue()).toEqual([m("a", "IZIN", 2), m("b", "HADIR", 3)]);
  });

  it("tap baru yang masuk saat kiriman berjalan tidak ikut terhapus", () => {
    enqueue(m("a", "HADIR", 1));
    const sent = readQueue();
    enqueue(m("a", "IZIN", 2)); // ditekan ulang sebelum server menjawab
    acknowledge(sent);
    expect(readQueue()).toEqual([m("a", "IZIN", 2)]);
  });

  it("gagal jaringan = antrean tetap utuh", async () => {
    enqueue(m("a", "HADIR", 1));
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")));
    expect(await sendQueue()).toEqual({ result: "offline", left: 1 });
    expect(readQueue()).toHaveLength(1);
  });

  it("server menerima = antrean kosong", async () => {
    enqueue(m("a", "HADIR", 1));
    vi.stubGlobal("fetch", () => Promise.resolve(new Response('{"saved":1}', { status: 200 })));
    expect(await sendQueue()).toEqual({ result: "ok", left: 0 });
  });
});
