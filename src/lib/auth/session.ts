import { createHmac, timingSafeEqual } from "node:crypto";

// Dipakai proxy.ts dan server — tanpa "server-only" supaya bisa diimpor proxy; tetap hanya jalan di server (node:crypto).
export const SESSION_COOKIE = "tb_session";
export const SESSION_DAYS = 30;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET belum diisi (min. 32 karakter)");
  return s;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

/** Nilai cookie sesi pelatih: "<kedaluwarsa ms>.<hmac>". */
export function createSessionValue(now = Date.now()): string {
  const exp = String(now + SESSION_DAYS * 86_400_000);
  return `${exp}.${sign(`coach.${exp}`)}`;
}

export function verifySessionValue(value: string | undefined, now = Date.now()): boolean {
  if (!value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || Number(exp) < now) return false;
  const want = Buffer.from(sign(`coach.${exp}`));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** Bandingkan kode akses tanpa bocor lewat waktu respons (hash dulu supaya panjang sama). */
export function accessCodeMatches(input: string): boolean {
  const code = process.env.COACH_ACCESS_CODE;
  if (!code || code.length < 8) throw new Error("COACH_ACCESS_CODE belum diisi (min. 8 karakter)");
  const h = (s: string) => createHmac("sha256", secret()).update(s.trim().toLowerCase()).digest();
  return timingSafeEqual(h(input), h(code));
}
