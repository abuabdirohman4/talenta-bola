// Isi awal: SSB Galuh Putra, KU 2016, daftar pemain, dan satu periode rapor. Aman dijalankan ulang (lewati kalau sudah ada).
// Nama anak asli dibaca dari src/db/roster.local.txt (tidak masuk git); tanpa file itu dipakai nama contoh.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { parseWaList } from "../lib/wa-import";
import { ageGroups, players, reportPeriods, ssbProfiles } from "./schema";

config({ path: process.env.ENV_FILE ?? ".env.local" });

const SAMPLE = `Athar, Bima, Candra, Daffa, Elang, Fikri, Galih, Hafidz, Ilham, Jaka, Kevin, Luthfi, Malik,
Naufal, Omar, Pandu, Qais, Raka, Satria, Taufik, Umar, Vino, Wira, Yusuf, Zaki, Arka, Bagas, Dimas, Fadil, Gilang`
  .split(",")
  .map((s) => s.trim())
  .join("\n");

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
  const db = drizzle(client);

  const [existing] = await db.select().from(ssbProfiles).limit(1);
  if (existing) {
    console.log(`SSB "${existing.name}" sudah ada — seed dilewati.`);
    await client.end();
    return;
  }

  const rosterPath = join(process.cwd(), "src/db/roster.local.txt");
  const roster = parseWaList(existsSync(rosterPath) ? readFileSync(rosterPath, "utf8") : SAMPLE);

  const [ssb] = await db
    .insert(ssbProfiles)
    .values({
      name: "SSB Galuh Putra",
      slug: "galuh-putra",
      homeGround: "Lapang Brigif 13 Galuh",
      headCoachName: "Coach Rizky",
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
