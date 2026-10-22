// Set kode akses pelatih satu SSB: `pnpm db:set-code <slug> <kode>` (ENV_FILE=.env.production untuk prod).
// Versi kode ikut naik → semua HP yang masuk dengan kode lama keluar. Butuh AUTH_SECRET yang SAMA dengan server.
import { config } from "dotenv";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hashAccessCode, MIN_CODE, normalizeCode } from "../lib/auth/session";
import { ssbProfiles } from "./schema";

config({ path: process.env.ENV_FILE ?? ".env.local" });

async function main() {
  const [slug, code] = process.argv.slice(2);
  if (!slug || !code) throw new Error("Pakai: pnpm db:set-code <slug> <kode>");
  if (normalizeCode(code).length < MIN_CODE) throw new Error(`Kode minimal ${MIN_CODE} karakter`);
  const hash = hashAccessCode(code);

  const client = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
  const db = drizzle(client);
  try {
    const [ssb] = await db.select().from(ssbProfiles).where(and(eq(ssbProfiles.slug, slug), isNull(ssbProfiles.deletedAt)));
    if (!ssb) throw new Error(`SSB dengan slug "${slug}" tidak ditemukan`);
    const [taken] = await db
      .select({ name: ssbProfiles.name })
      .from(ssbProfiles)
      .where(and(eq(ssbProfiles.accessCodeHash, hash), ne(ssbProfiles.id, ssb.id), isNull(ssbProfiles.deletedAt)));
    if (taken) throw new Error(`Kode ini sudah dipakai ${taken.name}`);
    const [row] = await db
      .update(ssbProfiles)
      .set({ accessCodeHash: hash, accessCodeVersion: sql`${ssbProfiles.accessCodeVersion} + 1`, updatedAt: new Date() })
      .where(eq(ssbProfiles.id, ssb.id))
      .returning({ version: ssbProfiles.accessCodeVersion });
    console.log(`Kode akses ${ssb.name} diset (versi ${row!.version}).`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
