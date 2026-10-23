import { describe, expect, it } from "vitest";
import { attendanceRate, resolveStatus, type Permission } from "../attendance";
import { buildRekap } from "../rekap";

const izin = (createdAt: number, extra: Partial<Permission> = {}): Permission => ({
  id: "p1",
  type: "IZIN",
  reason: "Acara keluarga",
  createdAt,
  resolvedAt: null,
  ...extra,
});

describe("resolveStatus", () => {
  it("tanpa input pelatih: izin ortu langsung jadi status", () => {
    expect(resolveStatus(undefined, izin(100))).toEqual({ status: "IZIN", source: "parent", pending: null });
  });

  it("izin masuk setelah pelatih mengisi: jadi pengajuan, input pelatih tidak ditimpa", () => {
    const r = resolveStatus({ status: "ALPA", updatedAt: 100 }, izin(200));
    expect(r.status).toBe("ALPA");
    expect(r.pending?.id).toBe("p1");
  });

  it("izin lama (sebelum pelatih mengisi) tidak memunculkan pengajuan", () => {
    expect(resolveStatus({ status: "HADIR", updatedAt: 300 }, izin(200)).pending).toBeNull();
  });

  it("pengajuan yang sudah diputuskan pelatih tidak muncul lagi", () => {
    expect(resolveStatus({ status: "ALPA", updatedAt: 100 }, izin(200, { resolvedAt: 250 })).pending).toBeNull();
  });

  it("belum ada apa pun = Belum konfirmasi", () => {
    expect(resolveStatus(undefined, undefined).status).toBe("BELUM");
  });
});

describe("attendanceRate", () => {
  it("hadir ÷ sesi terisi, Belum tidak dihitung", () => {
    expect(attendanceRate(["HADIR", "HADIR", "IZIN", "BELUM"])).toBe(67);
    expect(attendanceRate(["BELUM"])).toBeNull();
  });
});

describe("buildRekap", () => {
  it("format rapi dengan nomor urut tanpa loncat dan baris total", () => {
    const text = buildRekap({
      groupName: "KU 2016",
      sessionDate: "2026-09-20",
      startTime: "07:30:00",
      location: "Lapang Brigif Galuh",
      rows: [
        { name: "Athar", status: "HADIR" },
        { name: "Argya", status: "BELUM" },
        { name: "Shiraj", status: "IZIN" },
      ],
    });
    expect(text).toBe(
      [
        "Presensi KU 2016 — Minggu, 20 Sep 2026",
        "Lapang Brigif Galuh, 07.30",
        "",
        "1. Athar — Hadir",
        "2. Argya — Belum konfirmasi",
        "3. Shiraj — Izin",
        "",
        "Hadir 1 · Izin 1 · Sakit 0 · Alpa 0 · Belum konfirmasi 1",
      ].join("\n")
    );
  });

  it("alasan izin ikut di belakang status", () => {
    const text = buildRekap({
      groupName: "KU 2016",
      sessionDate: "2026-09-20",
      startTime: "07:30:00",
      location: null,
      rows: [
        { name: "Shiraj", status: "IZIN", note: "Acara keluarga" },
        { name: "Athar", status: "HADIR", note: null },
      ],
    });
    expect(text).toContain("1. Shiraj — Izin (Acara keluarga)");
    expect(text).toContain("2. Athar — Hadir\n");
  });
});
