import { and, eq, isNotNull } from "drizzle-orm";
import { Star } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Avatar } from "@/components/Avatar";
import { ClubHeader } from "@/components/ClubHeader";
import { db } from "@/db";
import { ageGroups, players, reportPeriods, reports, reportScores, ssbProfiles } from "@/db/schema";
import { getBaseUrl } from "@/lib/data";
import { formatDateId, dateWib } from "@/lib/format";
import { footLabel, positionLabel } from "@/lib/players";
import { getAttendanceSummary } from "@/lib/queries";
import { DEFAULT_SCORE, groupAverage, NARRATIVE_FIELDS, RUBRIC, SCORE_LABEL } from "@/lib/rubric";
import { ShareActions } from "./_components/ShareActions";

const load = cache(async (token: string) => {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const [row] = await db
    .select({ r: reports, p: players, period: reportPeriods, ssb: ssbProfiles, groupName: ageGroups.name })
    .from(reports)
    .innerJoin(players, eq(players.id, reports.playerId))
    .innerJoin(reportPeriods, eq(reportPeriods.id, reports.periodId))
    .innerJoin(ssbProfiles, eq(ssbProfiles.id, reports.ssbId))
    .innerJoin(ageGroups, eq(ageGroups.id, players.ageGroupId))
    .where(and(eq(reports.publicToken, token), isNotNull(reports.publishedAt)));
  return row ?? null;
});

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const row = await load((await params).token);
  return { title: row ? `Rapor ${row.p.fullName} · ${row.period.name}` : "Rapor" };
}

export default async function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const row = await load(token);
  if (!row) notFound();
  const { r, p, period, ssb } = row;

  const [scoreRows, attendance] = await Promise.all([
    db.select().from(reportScores).where(eq(reportScores.reportId, r.id)),
    getAttendanceSummary(p.id, p.ageGroupId, period.startDate, period.endDate),
  ]);
  const scores = Object.fromEntries(scoreRows.map((s) => [s.aspectKey, s.score]));
  const url = `${await getBaseUrl()}/r/${token}`;

  const identity = [
    ["Kelompok umur", row.groupName],
    ["Posisi", positionLabel(p.position)],
    ["Tanggal lahir", p.birthDate ? formatDateId(p.birthDate, { weekday: false }) : null],
    ["Kaki dominan", footLabel(p.preferredFoot)],
    ["Kehadiran", attendance.held ? `${attendance.hadir} dari ${attendance.held} sesi (${attendance.rate}%)` : "Belum ada sesi"],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <main className="brand mx-auto min-h-dvh max-w-xl px-4 py-6 print:max-w-none print:px-0" style={{ "--color-primary": ssb.primaryColor } as React.CSSProperties}>
      <article className="overflow-hidden rounded-2xl border border-line bg-card print:border-0">
        <div className="border-b-4 border-primary px-5 pt-5 pb-4">
          <ClubHeader name={ssb.name} logoUrl={ssb.logoUrl} subtitle={ssb.homeGround ?? undefined} />
          <p className="mt-4 text-xs font-bold tracking-[0.18em] text-primary uppercase">Rapor perkembangan pemain</p>
          <p className="text-[15px] text-muted">{period.name}</p>
        </div>

        <section className="flex flex-col items-center px-5 pt-6 text-center">
          <Avatar name={p.fullName} photoUrl={p.photoUrl} className="size-28 border-4 border-primary-soft text-3xl" />
          <h1 className="mt-3 font-serif text-3xl leading-tight font-bold">{p.fullName}</h1>
          {p.jerseyNumber ? <p className="font-semibold text-muted">Nomor punggung {p.jerseyNumber}</p> : null}
        </section>

        <dl className="mx-5 mt-5 divide-y divide-line rounded-xl border border-line text-[15px]">
          {identity.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-3 py-2">
              <dt className="text-muted">{k}</dt>
              <dd className="text-right font-semibold">{v}</dd>
            </div>
          ))}
        </dl>

        {/* Evaluasi naratif = bagian yang paling dibaca ortu: ruang terbesar, tipografi paling lega. */}
        <section className="mx-5 mt-6 space-y-4">
          <h2 className="text-lg font-extrabold">Catatan pelatih</h2>
          {NARRATIVE_FIELDS.map((f) =>
            r[f.key].trim() ? (
              <div key={f.key} className="rounded-xl bg-primary-soft p-4">
                <h3 className="text-sm font-bold text-primary">{f.label}</h3>
                <p className="mt-1 text-[17px] leading-relaxed">{r[f.key]}</p>
              </div>
            ) : null
          )}
          {NARRATIVE_FIELDS.every((f) => !r[f.key].trim()) && <p className="text-muted">Pelatih belum menulis catatan.</p>}
        </section>

        <section className="mx-5 mt-6 space-y-5">
          <h2 className="text-lg font-extrabold">Penilaian kemampuan</h2>
          {RUBRIC.map((g) => {
            const avg = groupAverage(g, scores);
            return (
              <div key={g.key} className="break-inside-avoid">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-bold">{g.label}</h3>
                  <span className="text-sm font-semibold text-muted">{SCORE_LABEL[Math.round(avg)]}</span>
                </div>
                <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-ground" aria-label={`Rata-rata ${avg} dari 5`}>
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(avg / 5) * 100}%` }} />
                </div>
                <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                  {g.aspects.map((a) => {
                    const v = scores[a.key] ?? DEFAULT_SCORE;
                    return (
                      <li key={a.key} className="flex items-center justify-between gap-2 text-[15px]">
                        <span>{a.label}</span>
                        <span className="flex shrink-0" aria-label={`${v} dari 5 bintang`}>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star key={n} size={15} className={n <= v ? "fill-izin text-izin" : "text-line"} aria-hidden />
                          ))}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          <p className="text-sm text-muted">Skala bintang: 1 Perlu banyak latihan · 3 Cukup · 5 Sangat baik.</p>
        </section>

        <footer className="mx-5 mt-8 mb-6 flex items-end justify-between border-t border-line pt-4 text-sm">
          <div>
            <p className="text-muted">Diterbitkan</p>
            <p className="font-semibold">{r.publishedAt ? formatDateId(dateWib(r.publishedAt), { weekday: false }) : ""}</p>
          </div>
          <div className="text-right">
            <p className="text-muted">Pelatih</p>
            <p className="font-serif text-base font-bold">{ssb.headCoachName ?? ssb.name}</p>
          </div>
        </footer>
      </article>

      <ShareActions url={url} text={`Rapor perkembangan ${p.fullName} (${period.name}) dari ${ssb.name}`} />
    </main>
  );
}
