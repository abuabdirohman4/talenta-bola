import { countStatuses, STATUS_LABEL, type SheetStatus } from "./attendance";
import { formatDateId, formatTimeId } from "./format";

export type RekapInput = {
  groupName: string;
  sessionDate: string;
  startTime: string;
  location: string | null;
  rows: { name: string; status: SheetStatus; note?: string | null }[];
};

/** Teks rekap siap tempel ke grup WA wali murid: simbol seragam, nomor urut tanpa loncat. */
export function buildRekap({ groupName, sessionDate, startTime, location, rows }: RekapInput): string {
  const c = countStatuses(rows.map((r) => r.status));
  const place = [location, formatTimeId(startTime)].filter(Boolean).join(", ");
  return [
    `Presensi ${groupName} — ${formatDateId(sessionDate)}`,
    place,
    "",
    ...rows.map((r, i) => `${i + 1}. ${r.name} — ${STATUS_LABEL[r.status]}${r.note ? ` (${r.note})` : ""}`),
    "",
    `Hadir ${c.HADIR} · Izin ${c.IZIN} · Sakit ${c.SAKIT} · Alpa ${c.ALPA} · Belum konfirmasi ${c.BELUM}`,
  ].join("\n");
}
