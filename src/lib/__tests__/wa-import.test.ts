import { describe, expect, it } from "vitest";
import { parseWaList } from "../wa-import";

describe("parseWaList", () => {
  it("membaca format daftar WA asli: nomor, emoji, status, instruksi", () => {
    const text = `Daftar siswa KU 2016
1. Athar ✅
7. Shiraj ❎ ijin
10. Kenzie ijin ❌
14. Hasan/sansan ✅
36. Rangga ❎ izin ( sakit )
37. M. Radika
42. Tulis yang belum ketulis`;
    expect(parseWaList(text)).toEqual([
      { fullName: "Athar", nickname: null },
      { fullName: "Shiraj", nickname: null },
      { fullName: "Kenzie", nickname: null },
      { fullName: "Hasan", nickname: "sansan" },
      { fullName: "Rangga", nickname: null },
      { fullName: "M. Radika", nickname: null },
    ]);
  });

  it("daftar tanpa nomor: tiap baris satu nama, duplikat dibuang", () => {
    expect(parseWaList("Athar\nargya\nAthar\n").map((p) => p.fullName)).toEqual(["Athar", "argya"]);
  });
});
