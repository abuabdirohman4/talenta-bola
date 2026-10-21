"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { ageGroups, players, reportPeriods, reports, reportScores } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { audit, getSsb, newToken } from "@/lib/data";
import { ASPECT_KEYS, NARRATIVE_KEYS, type NarrativeKey } from "@/lib/rubric";

type Ref = { periodId: string; playerId: string };
type Result = { error: string } | undefined;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function createPeriod(input: { ageGroupId: string; name: string; startDate: string; endDate: string }): Promise<Result> {
  await requireUser();
  const ssb = await getSsb();
  const name = input.name.trim();
  if (!name) return { error: "Nama periode wajib diisi" };
  if (!DATE.test(input.startDate) || !DATE.test(input.endDate) || input.endDate < input.startDate) {
    return { error: "Rentang tanggal tidak valid" };
  }
  const [g] = await db
    .select({ id: ageGroups.id })
    .from(ageGroups)
    .where(and(eq(ageGroups.id, input.ageGroupId), eq(ageGroups.ssbId, ssb.id), isNull(ageGroups.deletedAt)));
  if (!g) return { error: "Kelompok umur tidak ditemukan" };
  await db.insert(reportPeriods).values({ ssbId: ssb.id, ageGroupId: g.id, name, startDate: input.startDate, endDate: input.endDate });
  revalidatePath("/rapor");
}

/** Baris rapor dibuat saat pelatih pertama kali mengubah sesuatu — "belum dinilai" tetap jujur. */
async function ensureReport({ periodId, playerId }: Ref): Promise<{ id: string; ssbId: string } | null> {
  const ssb = await getSsb();
  const [ok] = await db
    .select({ periodId: reportPeriods.id })
    .from(reportPeriods)
    .innerJoin(players, eq(players.ageGroupId, reportPeriods.ageGroupId))
    .where(
      and(
        eq(reportPeriods.id, periodId),
        eq(reportPeriods.ssbId, ssb.id),
        isNull(reportPeriods.deletedAt),
        eq(players.id, playerId),
        isNull(players.deletedAt)
      )
    );
  if (!ok) return null;
  await db.insert(reports).values({ ssbId: ssb.id, periodId, playerId }).onConflictDoNothing();
  const [r] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(and(eq(reports.periodId, periodId), eq(reports.playerId, playerId)));
  return r ? { id: r.id, ssbId: ssb.id } : null;
}

export async function saveScore(ref: Ref, aspectKey: string, score: number): Promise<Result> {
  await requireUser();
  if (!ASPECT_KEYS.has(aspectKey) || !Number.isInteger(score) || score < 1 || score > 5) return { error: "Nilai tidak valid" };
  const r = await ensureReport(ref);
  if (!r) return { error: "Rapor tidak ditemukan" };
  const now = new Date();
  await db
    .insert(reportScores)
    .values({ reportId: r.id, aspectKey, score, updatedAt: now })
    .onConflictDoUpdate({ target: [reportScores.reportId, reportScores.aspectKey], set: { score, updatedAt: now } });
  await db.update(reports).set({ updatedAt: now }).where(eq(reports.id, r.id));
}

export async function saveNarrative(ref: Ref, field: NarrativeKey, value: string): Promise<Result> {
  await requireUser();
  if (!NARRATIVE_KEYS.has(field)) return { error: "Kolom tidak dikenal" };
  const r = await ensureReport(ref);
  if (!r) return { error: "Rapor tidak ditemukan" };
  await db
    .update(reports)
    .set({ [field]: value.slice(0, 2000), updatedAt: new Date() })
    .where(eq(reports.id, r.id));
}

/** Terbitkan = ortu bisa melihat. Token rapor dibuat sekali dan dipertahankan saat terbit ulang. */
export async function setPublished(ref: Ref, published: boolean): Promise<{ publicToken?: string; error?: string }> {
  await requireUser();
  const r = await ensureReport(ref);
  if (!r) return { error: "Rapor tidak ditemukan" };
  const [cur] = await db.select({ token: reports.publicToken }).from(reports).where(eq(reports.id, r.id));
  const token = cur?.token ?? newToken();
  await db
    .update(reports)
    .set({ publishedAt: published ? new Date() : null, publicToken: token, updatedAt: new Date() })
    .where(eq(reports.id, r.id));
  await audit({ ssbId: r.ssbId, action: published ? "publish" : "unpublish", tableName: "reports", recordId: r.id });
  revalidatePath(`/rapor/${ref.periodId}`);
  return { publicToken: token };
}
