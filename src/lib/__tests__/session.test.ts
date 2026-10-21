import { beforeAll, describe, expect, it } from "vitest";
import { accessCodeMatches, createSessionValue, verifySessionValue } from "../auth/session";

beforeAll(() => {
  process.env.AUTH_SECRET = "x".repeat(32);
  process.env.COACH_ACCESS_CODE = "galuh-123456";
});

describe("sesi pelatih", () => {
  it("cookie buatan sendiri valid", () => {
    expect(verifySessionValue(createSessionValue())).toBe(true);
  });

  it("cookie kedaluwarsa atau diubah ditolak", () => {
    const v = createSessionValue(0); // kedaluwarsa 30 hari setelah epoch
    expect(verifySessionValue(v)).toBe(false);
    const [exp, sig] = createSessionValue().split(".");
    expect(verifySessionValue(`${Number(exp) + 1}.${sig}`)).toBe(false);
    expect(verifySessionValue(undefined)).toBe(false);
  });

  it("kode akses: abaikan huruf besar & spasi tepi, tolak yang salah", () => {
    expect(accessCodeMatches(" GALUH-123456 ")).toBe(true);
    expect(accessCodeMatches("galuh-12345")).toBe(false);
  });
});
