export const STATUSES = ["HADIR", "IZIN", "SAKIT", "ALPA"] as const;
export type Status = (typeof STATUSES)[number];
export type SheetStatus = Status | "BELUM";

export const STATUS_LABEL: Record<SheetStatus, string> = {
  HADIR: "Hadir",
  IZIN: "Izin",
  SAKIT: "Sakit",
  ALPA: "Alpa",
  BELUM: "Belum konfirmasi",
};

export type Mark = { status: Status; updatedAt: number; note?: string | null };
/** Batas panjang alasan izin dari pelatih. */
export const NOTE_MAX = 120;
export type Permission = {
  id: string;
  type: "IZIN" | "SAKIT";
  reason: string;
  createdAt: number;
  resolvedAt: number | null;
};

export type Resolved = {
  status: SheetStatus;
  source: "coach" | "parent" | null;
  /** Izin ortu yang masuk SETELAH pelatih mengisi — pelatih yang memutuskan. */
  pending: Permission | null;
};

/**
 * Aturan konflik izin ortu vs input pelatih:
 * - belum ada input pelatih → izin ortu langsung jadi status;
 * - izin masuk setelah pelatih mengisi → jadi pengajuan, input pelatih tidak pernah ditimpa;
 * - izin ganda → yang terakhir menang (pemanggil mengirim izin terbaru saja).
 */
export function resolveStatus(mark: Mark | undefined, permission: Permission | undefined): Resolved {
  if (!mark) {
    return permission
      ? { status: permission.type, source: "parent", pending: null }
      : { status: "BELUM", source: null, pending: null };
  }
  const pending =
    permission && !permission.resolvedAt && permission.createdAt > mark.updatedAt && permission.type !== mark.status
      ? permission
      : null;
  return { status: mark.status, source: "coach", pending };
}

export function countStatuses(statuses: SheetStatus[]): Record<SheetStatus, number> {
  const c: Record<SheetStatus, number> = { HADIR: 0, IZIN: 0, SAKIT: 0, ALPA: 0, BELUM: 0 };
  for (const s of statuses) c[s]++;
  return c;
}

/** Hadir ÷ sesi yang sudah ada isinya (bukan Belum). null kalau belum ada data. */
export function attendanceRate(statuses: SheetStatus[]): number | null {
  const filled = statuses.filter((s) => s !== "BELUM");
  if (!filled.length) return null;
  return Math.round((filled.filter((s) => s === "HADIR").length / filled.length) * 100);
}
