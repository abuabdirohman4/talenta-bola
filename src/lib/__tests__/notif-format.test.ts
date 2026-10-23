import { describe, expect, it } from "vitest";
import { permissionNotice } from "../notif-format";

describe("permissionNotice", () => {
  it("pakai nama panggilan, label Sakit/Izin, tanggal Indonesia", () => {
    const n = permissionNotice({ nickname: "Budi", fullName: "Budi Santoso", type: "SAKIT", date: "2026-10-24", reason: "demam" });
    expect(n.title).toBe("Izin dari ortu: Budi");
    expect(n.body).toBe("Sakit untuk Sabtu, 24 Okt 2026: demam");
  });
  it("tanpa nama panggilan jatuh ke nama lengkap", () => {
    expect(permissionNotice({ nickname: null, fullName: "Budi Santoso", type: "IZIN", date: "2026-10-24", reason: "acara" }).title).toBe(
      "Izin dari ortu: Budi Santoso"
    );
  });
});
