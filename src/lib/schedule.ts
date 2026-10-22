import { addDays } from "./format";

export const WEEKDAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;

/** Tanggal-tanggal hari `weekday` (0 = Minggu) dalam `weeks` minggu mulai `today` (YYYY-MM-DD WIB); tidak pernah tanggal lampau. */
export function weekdayDates(weekday: number, today: string, weeks = 4): string[] {
  const offset = (weekday - new Date(today + "T00:00:00Z").getUTCDay() + 7) % 7;
  return Array.from({ length: weeks }, (_, i) => addDays(today, offset + i * 7));
}
