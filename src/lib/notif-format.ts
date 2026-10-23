import { formatDateId } from "./format";

/** Isi notifikasi izin ortu, mis. judul "Izin dari ortu: Budi", body "Sakit untuk Sabtu, 24 Okt 2026: demam". */
export function permissionNotice(p: { nickname: string | null; fullName: string; type: "IZIN" | "SAKIT"; date: string; reason: string }) {
  return {
    title: `Izin dari ortu: ${p.nickname?.trim() || p.fullName}`,
    body: `${p.type === "SAKIT" ? "Sakit" : "Izin"} untuk ${formatDateId(p.date)}: ${p.reason}`,
  };
}
