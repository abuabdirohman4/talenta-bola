import { describe, expect, it } from "vitest";
import { dateWib } from "../format";
import { weekdayDates } from "../schedule";

describe("jadwal rutin → tanggal sesi", () => {
  it("4 tanggal berurutan per minggu, mulai hari ini kalau harinya cocok", () => {
    // 2026-10-25 = Minggu
    expect(weekdayDates(0, "2026-10-25")).toEqual(["2026-10-25", "2026-11-01", "2026-11-08", "2026-11-15"]);
  });

  it("tidak pernah tanggal lampau dan tetap dalam 4 minggu ke depan", () => {
    const today = "2026-10-22"; // Kamis
    for (let wd = 0; wd < 7; wd++) {
      const dates = weekdayDates(wd, today);
      expect(dates).toHaveLength(4);
      expect(dates.every((d) => d >= today && d <= "2026-11-18")).toBe(true);
      expect(dates.every((d) => new Date(d + "T00:00:00Z").getUTCDay() === wd)).toBe(true);
    }
    expect(weekdayDates(3, today)[0]).toBe("2026-10-28"); // Rabu depan, bukan Rabu kemarin
  });

  it("melewati akhir bulan & tahun", () => {
    expect(weekdayDates(4, "2026-12-30")).toEqual(["2026-12-31", "2027-01-07", "2027-01-14", "2027-01-21"]);
  });

  it("hari ini = tanggal WIB: Sabtu 18.00 UTC sudah Minggu pagi di WIB", () => {
    const today = dateWib(new Date("2026-10-24T18:00:00Z"));
    expect(weekdayDates(0, today)[0]).toBe("2026-10-25");
  });
});
