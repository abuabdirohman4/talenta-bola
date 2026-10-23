import { addDays } from "./format";

export const WEEKDAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;

/** Tanggal-tanggal hari `weekday` (0 = Minggu) dalam `weeks` minggu mulai `today` (YYYY-MM-DD WIB); tidak pernah tanggal lampau. */
export function weekdayDates(weekday: number, today: string, weeks = 4): string[] {
  const offset = (weekday - new Date(today + "T00:00:00Z").getUTCDay() + 7) % 7;
  return Array.from({ length: weeks }, (_, i) => addDays(today, offset + i * 7));
}

/** Petak kalender bulan "YYYY-MM", Senin di kolom pertama; null = sel kosong sebelum tanggal 1. */
export function monthGrid(month: string): (string | null)[] {
  const first = new Date(month + "-01T00:00:00Z");
  const lead = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => addDays(month + "-01", i))];
}

/** "2026-10" ± n bulan. */
export function shiftMonth(month: string, n: number): string {
  const d = new Date(month + "-01T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
}
