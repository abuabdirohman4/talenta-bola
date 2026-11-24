// Isi awal: SSB Garuda Muda (kode akses = COACH_ACCESS_CODE), KU 2016, daftar pemain, dan satu periode rapor. Aman dijalankan ulang (lewati kalau sudah ada).
// Roster = src/db/roster.demo.ts (79 nama fiktif). Daftar anak sungguhan tidak pernah dipakai seed.
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hashAccessCode, MIN_CODE } from "../lib/auth/session";
import { ROSTER_DEMO } from "./roster.demo";
import { ageGroups, players, reportPeriods, ssbProfiles } from "./schema";

config({ path: process.env.ENV_FILE ?? ".env.local" });

async function main() {
  const code = process.env.COACH_ACCESS_CODE ?? "";
  if (code.trim().length < MIN_CODE) throw new Error(`COACH_ACCESS_CODE (min. ${MIN_CODE} karakter) dipakai sebagai kode akses awal SSB seed`);
  const client = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
  const db = drizzle(client);

  const [existing] = await db.select().from(ssbProfiles).limit(1);
  if (existing) {
    console.log(`SSB "${existing.name}" sudah ada — seed dilewati.`);
    await client.end();
    return;
  }

  const roster = ROSTER_DEMO.map((fullName) => ({ fullName, nickname: null as string | null }));

  const [ssb] = await db
    .insert(ssbProfiles)
    .values({
      name: "SSB Garuda Muda",
      slug: "garuda-muda",
      homeGround: "Lapangan Merdeka",
      headCoachName: "Coach Dimas",
      accessCodeHash: hashAccessCode(code),
    })
    .returning();
  const [ku] = await db
    .insert(ageGroups)
    .values({ ssbId: ssb!.id, code: "KU-10", name: "KU 2016", birthYear: 2016 })
    .returning();
  await db.insert(players).values(
    roster.map((p, i) => ({
      ssbId: ssb!.id,
      ageGroupId: ku!.id,
      fullName: p.fullName,
      nickname: p.nickname,
      sortOrder: i + 1,
      parentToken: randomBytes(24).toString("base64url"),
    }))
  );
  await db.insert(reportPeriods).values({
    ssbId: ssb!.id,
    ageGroupId: ku!.id,
    name: "Periode Okt–Des 2026",
    startDate: "2026-10-01",
    endDate: "2026-12-31",
  });

  console.log(`Seed selesai: ${ssb!.name}, ${ku!.name}, ${roster.length} pemain.`);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
