// @vitest-environment node
// src/lib/__tests__/guard.test.ts — gagal kalau ada pintu server tanpa penjaga atau kunci service-role bocor ke 'use server'.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const GUARD = /\brequire(User|Role|Owner)\s*\(/g;
// Area super-admin punya penjaga sendiri; requireUser (sesi pelatih) tidak sah di sana.
const ADMIN_GUARD = /\brequireAdmin\s*\(/g;
const isAdminArea = (rel: string) => rel.startsWith("app/admin/");
const SERVICE_ROLE = /SUPABASE_SERVICE_ROLE_KEY|createAdminClient\s*\(/;
const USE_SERVER = /^\s*["']use server["'];?\s*$/gm;
// Pintu yang memang publik (callback OAuth, webhook bertoken, aksi signin) — tiap entri wajib beralasan saat review.
const PUBLIC = new Set<string>([
  "app/masuk/actions.ts", // masuk/keluar: belum punya sesi
  "app/ortu/[token]/actions.ts", // izin ortu: dijaga token acak per anak
  "app/admin/masuk/actions.ts", // masuk/keluar super-admin: belum punya sesi
]);

const files = (readdirSync(SRC, { recursive: true }) as string[])
  .filter((f) => /\.tsx?$/.test(f) && !f.includes("__tests__"))
  .map((f) => ({ rel: f.split("\\").join("/"), code: readFileSync(join(SRC, f), "utf8") }));

const count = (code: string, re: RegExp) => (code.match(re) ?? []).length;
const fileLevel = (code: string) => /^(\s*(\/\/[^\n]*|\/\*[\s\S]*?\*\/))*\s*["']use server["']/.test(code);
const isRoute = (rel: string) => /(^|\/)route\.tsx?$/.test(rel);
const isUseServer = (code: string) => count(code, USE_SERVER) > 0;
// ponytail: hitung ekspor (file-level/route) atau direktif inline vs panggilan guard, bukan parse AST;
// ceiling = guard di helper non-ekspor ikut terhitung. Ganti ke AST (ts-morph) kalau lolos-palsu mulai terjadi.
const needed = (rel: string, code: string) =>
  fileLevel(code) || isRoute(rel)
    ? count(code, /export\s+(async\s+function|const\s+\w+\s*=\s*async)/g)
    : count(code, USE_SERVER);

describe("guard server", () => {
  it("tiap server action & route handler memanggil requireUser() (area admin: requireAdmin())", () => {
    const bolong = files
      .filter(({ rel, code }) => !PUBLIC.has(rel) && count(code, isAdminArea(rel) ? ADMIN_GUARD : GUARD) < needed(rel, code))
      .map(({ rel }) => rel);
    expect(bolong).toEqual([]);
  });

  it("service-role hanya di file 'server-only', tidak pernah di 'use server'", () => {
    const bocor = files.filter(({ code }) => isUseServer(code) && SERVICE_ROLE.test(code)).map(({ rel }) => rel);
    const tanpaServerOnly = files
      .filter(({ code }) => code.includes("SUPABASE_SERVICE_ROLE_KEY") && !/import\s+["']server-only["']/.test(code))
      .map(({ rel }) => rel);
    expect({ bocor, tanpaServerOnly }).toEqual({ bocor: [], tanpaServerOnly: [] });
  });
});
