import { createHmac, timingSafeEqual } from "node:crypto";

// Dipakai proxy.ts, server, dan skrip CLI — tanpa "server-only" supaya bisa diimpor di sana; tetap hanya jalan di server (node:crypto).
export const SESSION_COOKIE = "tb_session";
export const SESSION_DAYS = 30;
export const ADMIN_COOKIE = "tb_admin";
export const ADMIN_HOURS = 12;
export const MIN_CODE = 4;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET belum diisi (min. 32 karakter)");
  return s;
}

const hmac = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");
const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export const normalizeCode = (code: string) => code.trim().toLowerCase();

/** Hash deterministik kode akses SSB (disimpan di ssb_profiles.access_code_hash, dicari saat masuk). Ganti AUTH_SECRET = semua kode harus di-set ulang. */
export const hashAccessCode = (code: string) =>
  createHmac("sha256", secret()).update(normalizeCode(code)).digest("hex");

export type CoachSession = { ssbId: string; version: number };

/** Cookie sesi pelatih: "<ssb_id>.<versi kode>.<kedaluwarsa ms>.<hmac>". Versi beda dengan DB = sesi dicabut. */
export function createSessionValue(s: CoachSession, now = Date.now()): string {
  const body = `${s.ssbId}.${s.version}.${now + SESSION_DAYS * 86_400_000}`;
  return `${body}.${hmac(`coach.${body}`)}`;
}

/** Cek tanda tangan + kedaluwarsa saja (tanpa DB) — versi & SSB terhapus dicek di server (require-user.ts). */
export function verifySessionValue(value: string | undefined, now = Date.now()): CoachSession | null {
  const parts = value?.split(".") ?? [];
  if (parts.length !== 4) return null;
  const [ssbId, version, exp, sig] = parts as [string, string, string, string];
  if (!/^[0-9a-f-]{36}$/.test(ssbId) || !/^\d+$/.test(version) || !(Number(exp) >= now)) return null;
  if (!safeEqual(sig, hmac(`coach.${ssbId}.${version}.${exp}`))) return null;
  return { ssbId, version: Number(version) };
}

// Kode super-admin ikut ditandatangani: ganti SUPER_ADMIN_CODE = semua cookie admin lama gugur.
function adminCode(): string | null {
  const c = process.env.SUPER_ADMIN_CODE;
  return c && c.length >= 12 ? c : null;
}

/** Cookie super-admin: "<kedaluwarsa ms>.<hmac>"; awalan "admin." membuatnya tak tertukar dengan cookie pelatih. */
export function createAdminValue(now = Date.now()): string {
  const code = adminCode();
  if (!code) throw new Error("SUPER_ADMIN_CODE belum diisi (min. 12 karakter)");
  const exp = String(now + ADMIN_HOURS * 3_600_000);
  return `${exp}.${hmac(`admin.${exp}.${code}`)}`;
}

export function verifyAdminValue(value: string | undefined, now = Date.now()): boolean {
  const code = adminCode();
  const parts = value?.split(".") ?? [];
  if (!code || parts.length !== 2) return false;
  const [exp, sig] = parts as [string, string];
  return /^\d+$/.test(exp) && Number(exp) >= now && safeEqual(sig, hmac(`admin.${exp}.${code}`));
}

/** Bandingkan kode super-admin tanpa bocor lewat waktu respons (hash dulu supaya panjang sama). */
export function adminCodeMatches(input: string): boolean {
  const code = adminCode();
  if (!code) return false;
  return safeEqual(hmac(`code.${input.trim()}`), hmac(`code.${code}`));
}
