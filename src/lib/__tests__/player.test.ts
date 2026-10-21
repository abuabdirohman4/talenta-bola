import { describe, expect, it } from "vitest";
import { normalizePhoneWa, validatePlayer } from "../validation/player";

describe("validatePlayer", () => {
  it("menolak berat tidak masuk akal untuk anak (kasus Hasan 144 cm / 12 kg)", () => {
    expect(validatePlayer({ fullName: "Hasan", heightCm: 144, weightKg: 12 }).errors.weightKg).toBeDefined();
  });

  it("menolak kombinasi tinggi-berat yang mustahil walau lolos batas tunggal", () => {
    expect(validatePlayer({ fullName: "Hasan", heightCm: 144, weightKg: 15 }).errors.weightKg).toBeDefined();
  });

  it("menerima data wajar", () => {
    expect(validatePlayer({ fullName: "Hasan", heightCm: 144, weightKg: 36 }).ok).toBe(true);
  });

  it("menerima nama saja tanpa data fisik", () => {
    expect(validatePlayer({ fullName: "Athar" }).ok).toBe(true);
  });

  it("menolak nama kosong", () => {
    expect(validatePlayer({ fullName: "  " }).errors.fullName).toBeDefined();
  });

  it("tahun lahir beda KU = warning, tetap boleh simpan", () => {
    const r = validatePlayer({ fullName: "Budi", birthDate: "2014-05-07", ageGroupBirthYear: 2016 });
    expect(r.ok).toBe(true);
    expect(r.warnings.birthDate).toBeDefined();
  });

  it("menolak nomor punggung di luar 1-99 dan nomor WA ngawur", () => {
    const r = validatePlayer({ fullName: "Budi", jerseyNumber: 120, parentPhoneWa: "12345" });
    expect(r.errors.jerseyNumber).toBeDefined();
    expect(r.errors.parentPhoneWa).toBeDefined();
  });
});

describe("normalizePhoneWa", () => {
  it.each([
    ["0812-3456-7890", "6281234567890"],
    ["+62 812 3456 7890", "6281234567890"],
    ["81234567890", "6281234567890"],
  ])("%s → %s", (raw, want) => expect(normalizePhoneWa(raw)).toBe(want));

  it("menolak nomor bukan HP", () => expect(normalizePhoneWa("022-1234")).toBeNull());
});
