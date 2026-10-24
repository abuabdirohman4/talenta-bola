import { RUBRIC } from "./rubric";
import type { Status } from "./attendance";

// ---- Perlu perhatian: belum ditandai = Alpa; izin ortu mengisi kalau pelatih belum menandai. ----
export type Mark = { playerId: string; status: Status; note: string | null };
export type Perm = { playerId: string; type: "IZIN" | "SAKIT"; reason: string; createdAt: number };

const ORDER: Status[] = ["ALPA", "SAKIT", "IZIN"];

export function summarizeAttendance<P extends { id: string }>(players: P[], marks: Mark[], perms: Perm[]) {
  const markBy = new Map(marks.map((m) => [m.playerId, m]));
  const permBy = new Map<string, Perm>();
  for (const p of perms) if (!permBy.has(p.playerId) || permBy.get(p.playerId)!.createdAt < p.createdAt) permBy.set(p.playerId, p);
  const counts: Record<Status, number> = { HADIR: 0, IZIN: 0, SAKIT: 0, ALPA: 0 };
  const attention: { player: P; status: Status; note: string | null }[] = [];
  for (const player of players) {
    const m = markBy.get(player.id);
    const perm = permBy.get(player.id);
    const status: Status = m ? m.status : perm ? perm.type : "ALPA";
    const note = m ? m.note : perm ? perm.reason : null;
    counts[status]++;
    if (status !== "HADIR") attention.push({ player, status, note: note || null });
  }
  attention.sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
  return { counts, attention };
}

// ---- Tren kehadiran ----
export type TrendPoint = { x: number; y: number; pct: number; date: string };
export const CHART = { w: 600, h: 220, l: 36, r: 14, t: 14, b: 30 };

export function trendPoints(sessions: { date: string; pct: number }[]): TrendPoint[] {
  const { w, h, l, r, t, b } = CHART;
  const n = sessions.length;
  return sessions.map((s, i) => ({
    x: n === 1 ? (l + w - r) / 2 : l + (i * (w - l - r)) / (n - 1),
    y: t + (1 - s.pct / 100) * (h - t - b),
    pct: s.pct,
    date: s.date,
  }));
}

// ---- Radar: 4 kategori (rubrik "Fisik & mental" dipecah dua). ----
const FISIK = new Set(["kecepatan", "kelincahan", "stamina", "koordinasi"]);
export const CATEGORIES: { key: string; label: string; aspects: Set<string> }[] = [
  { key: "teknik", label: "Teknik", aspects: new Set(RUBRIC[0].aspects.map((a) => a.key)) },
  { key: "taktik", label: "Taktik", aspects: new Set(RUBRIC[1].aspects.map((a) => a.key)) },
  { key: "fisik", label: "Fisik", aspects: FISIK },
  { key: "mental", label: "Mental", aspects: new Set(RUBRIC[2].aspects.map((a) => a.key).filter((k) => !FISIK.has(k))) },
];

export type ScoreRow = { playerId: string; name: string; aspectKey: string; score: number };

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Rata-rata tim per kategori + 3 pemain tertinggi per kategori. */
export function categoryStats(rows: ScoreRow[]) {
  return CATEGORIES.map((c) => {
    const inCat = rows.filter((r) => c.aspects.has(r.aspectKey));
    const byPlayer = new Map<string, { name: string; s: number[] }>();
    for (const r of inCat) {
      const e = byPlayer.get(r.playerId) ?? { name: r.name, s: [] };
      e.s.push(r.score);
      byPlayer.set(r.playerId, e);
    }
    const top = [...byPlayer.values()]
      .map((e) => ({ name: e.name, avg: avg(e.s)! }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 3)
      .map((e) => ({ name: e.name, avg: round1(e.avg) }));
    const a = avg(inCat.map((r) => r.score));
    return { key: c.key, label: c.label, avg: a == null ? 0 : round1(a), top };
  });
}

/** Titik poligon radar; sumbu pertama di atas, searah jarum jam. Nilai 1–max, 0 di pusat. */
export function radarPoint(i: number, n: number, value: number, max: number, cx: number, cy: number, radius: number) {
  const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const d = (value / max) * radius;
  return { x: cx + d * Math.cos(ang), y: cy + d * Math.sin(ang) };
}
