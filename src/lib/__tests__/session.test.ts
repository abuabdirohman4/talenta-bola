import { beforeAll, describe, expect, it } from "vitest";
import {
  adminCodeMatches,
  createAdminValue,
  createSessionValue,
  hashAccessCode,
  normalizeCode,
  verifyAdminValue,
  verifySessionValue,
} from "../auth/session";

const SSB = "0b6f1c2e-6d0a-4c47-9a9e-3c1f2b7d8e90";

beforeAll(() => {
  process.env.AUTH_SECRET = "x".repeat(32);
  process.env.SUPER_ADMIN_CODE = "pemilik-produk-123";
});

describe("sesi pelatih", () => {
  it("cookie buatan sendiri valid dan membawa ssb_id + versi", () => {
    expect(verifySessionValue(createSessionValue({ ssbId: SSB, version: 3 }))).toEqual({ ssbId: SSB, version: 3 });
  });

  it("cookie kedaluwarsa, diubah, atau format lama ditolak", () => {
    expect(verifySessionValue(createSessionValue({ ssbId: SSB, version: 1 }, 0))).toBeNull();
    const [id, ver, exp, sig] = createSessionValue({ ssbId: SSB, version: 1 }).split(".");
    expect(verifySessionValue(`${id}.${ver}.${Number(exp) + 1}.${sig}`)).toBeNull();
    // Naikkan versi sendiri tanpa tanda tangan baru = tidak bisa memakai sesi lama setelah kode diganti.
    expect(verifySessionValue(`${id}.2.${exp}.${sig}`)).toBeNull();
    expect(verifySessionValue(`${"1".repeat(8)}-0000-0000-0000-000000000000.${ver}.${exp}.${sig}`)).toBeNull();
    expect(verifySessionValue(`${exp}.${sig}`)).toBeNull(); // cookie satu-kode lama
    expect(verifySessionValue(undefined)).toBeNull();
  });
});

describe("kode akses per SSB", () => {
  it("normalisasi: abaikan huruf besar & spasi tepi", () => {
    expect(normalizeCode("  GaLuh ")).toBe("galuh");
    expect(hashAccessCode(" GALUH ")).toBe(hashAccessCode("galuh"));
  });

  it("hash deterministik, beda kode beda hash, tergantung AUTH_SECRET", () => {
    const h = hashAccessCode("galuh");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(hashAccessCode("galuh2")).not.toBe(h);
    process.env.AUTH_SECRET = "y".repeat(32);
    expect(hashAccessCode("galuh")).not.toBe(h);
    process.env.AUTH_SECRET = "x".repeat(32);
  });
});

describe("sesi super-admin terpisah dari pelatih", () => {
  it("cookie admin valid; kedaluwarsa/diubah ditolak", () => {
    expect(verifyAdminValue(createAdminValue())).toBe(true);
    expect(verifyAdminValue(createAdminValue(0))).toBe(false);
    const [exp, sig] = createAdminValue().split(".");
    expect(verifyAdminValue(`${Number(exp) + 1}.${sig}`)).toBe(false);
  });

  it("cookie pelatih tidak berlaku sebagai admin, dan sebaliknya", () => {
    const coach = createSessionValue({ ssbId: SSB, version: 1 });
    expect(verifyAdminValue(coach)).toBe(false);
    // Tanda tangan pelatih dengan bentuk cookie admin tetap ditolak (awalan payload beda).
    const [, , exp, sig] = coach.split(".");
    expect(verifyAdminValue(`${exp}.${sig}`)).toBe(false);
    expect(verifySessionValue(createAdminValue())).toBeNull();
  });

  it("ganti SUPER_ADMIN_CODE menggugurkan cookie admin lama", () => {
    const v = createAdminValue();
    process.env.SUPER_ADMIN_CODE = "kode-admin-baru-456";
    expect(verifyAdminValue(v)).toBe(false);
    process.env.SUPER_ADMIN_CODE = "pemilik-produk-123";
    expect(verifyAdminValue(v)).toBe(true);
  });

  it("kode admin: cocok persis (spasi tepi diabaikan); kosong/pendek = admin mati", () => {
    expect(adminCodeMatches(" pemilik-produk-123 ")).toBe(true);
    expect(adminCodeMatches("PEMILIK-PRODUK-123")).toBe(false);
    process.env.SUPER_ADMIN_CODE = "pendek";
    expect(adminCodeMatches("pendek")).toBe(false);
    expect(verifyAdminValue(createSessionValue({ ssbId: SSB, version: 1 }))).toBe(false);
    process.env.SUPER_ADMIN_CODE = "pemilik-produk-123";
  });
});
