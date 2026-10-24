import { describe, expect, it } from "vitest";
import { categoryStats, radarPoint, summarizeAttendance, trendPoints } from "../dashboard";

describe("summarizeAttendance", () => {
  const players = ["a", "b", "c", "d", "e"].map((id) => ({ id }));
  it("belum ditandai = alpa, izin ortu dipakai, urut alpa-sakit-izin", () => {
    const r = summarizeAttendance(
      players,
      [
        { playerId: "a", status: "HADIR", note: null },
        { playerId: "b", status: "IZIN", note: "acara keluarga" },
      ],
      [{ playerId: "c", type: "SAKIT", reason: "demam", createdAt: 1 }]
    );
    expect(r.counts).toEqual({ HADIR: 1, IZIN: 1, SAKIT: 1, ALPA: 2 });
    expect(r.attention.map((x) => x.status)).toEqual(["ALPA", "ALPA", "SAKIT", "IZIN"]);
    expect(r.attention.find((x) => x.player.id === "b")!.note).toBe("acara keluarga");
  });
});

describe("categoryStats", () => {
  it("rata-rata per kategori dan top 3", () => {
    const rows = [
      { playerId: "1", name: "A", aspectKey: "passing", score: 5 },
      { playerId: "2", name: "B", aspectKey: "passing", score: 3 },
      { playerId: "1", name: "A", aspectKey: "stamina", score: 2 },
      { playerId: "1", name: "A", aspectKey: "disiplin", score: 4 },
    ];
    const s = Object.fromEntries(categoryStats(rows).map((c) => [c.key, c]));
    expect(s.teknik.avg).toBe(4);
    expect(s.teknik.top[0]).toEqual({ name: "A", avg: 5 });
    expect(s.fisik.avg).toBe(2);
    expect(s.mental.avg).toBe(4);
    expect(s.taktik.avg).toBe(0);
  });
});

describe("geometri", () => {
  it("radar: nilai penuh sumbu 0 tepat di atas pusat", () => {
    const p = radarPoint(0, 4, 5, 5, 100, 100, 80);
    expect(Math.round(p.x)).toBe(100);
    expect(Math.round(p.y)).toBe(20);
  });
  it("tren: 100% di atas, 0% di bawah, titik tunggal di tengah", () => {
    const [a, b] = trendPoints([{ date: "2026-10-01", pct: 100 }, { date: "2026-10-02", pct: 0 }]);
    expect(a.y).toBeLessThan(b.y);
    expect(a.x).toBeLessThan(b.x);
    expect(trendPoints([{ date: "x", pct: 50 }])).toHaveLength(1);
  });
});
