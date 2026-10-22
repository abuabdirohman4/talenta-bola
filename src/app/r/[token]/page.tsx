import { and, eq, isNotNull } from "drizzle-orm";
import { Check, Lightbulb } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Avatar } from "@/components/Avatar";
import { ClubHeader } from "@/components/ClubHeader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { db } from "@/db";
import { ageGroups, players, reportPeriods, reports, reportScores, ssbProfiles } from "@/db/schema";
import { getBaseUrl } from "@/lib/data";
import { formatDateId, dateWib } from "@/lib/format";
import { footLabel, positionLabel } from "@/lib/players";
import { getAttendanceSummary } from "@/lib/queries";
import { DEFAULT_SCORE, groupAverage, NARRATIVE_FIELDS, RUBRIC, SCORE_LABEL } from "@/lib/rubric";
import { cn } from "@/lib/utils";
import { ShareActions } from "./_components/ShareActions";

// Warna per kelompok aspek, urutan sama dengan RUBRIC.
const TONE = [
  { dot: "bg-primary", text: "text-primary" },
  { dot: "bg-info", text: "text-info" },
  { dot: "bg-sakit", text: "text-sakit" },
];

// Warna kartu narasi per bidang.
const NARRATIVE_TONE = { strengths: "text-primary", improvements: "text-warn", nextTarget: "text-info", homeTraining: "text-sakit" } as const;

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

  const all = RUBRIC.flatMap((g) => g.aspects);
  const avg = Math.round((all.reduce((sum, a) => sum + (scores[a.key] ?? DEFAULT_SCORE), 0) / all.length) * 10) / 10;
  const position = positionLabel(p.position);
  const meta = [
    p.jerseyNumber ? ["No. punggung", `#${p.jerseyNumber}`] : null,
    position ? ["Posisi", position] : null,
    row.groupName ? ["Kelompok umur", row.groupName] : null,
    footLabel(p.preferredFoot) ? ["Kaki dominan", footLabel(p.preferredFoot)!] : null,
    p.birthDate ? ["Tanggal lahir", formatDateId(p.birthDate, { weekday: false })] : null,
  ].filter(Boolean) as [string, string][];
  const hasNarrative = NARRATIVE_FIELDS.some((f) => r[f.key].trim());

  return (
    <main
      className="brand mx-auto min-h-dvh max-w-5xl px-4 py-5 [print-color-adjust:exact] print:max-w-none print:px-0 print:py-0"
      style={{ "--color-primary": ssb.primaryColor } as React.CSSProperties}
    >
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow text-primary!">Rapor digital resmi</p>
          <p className="truncate text-sm font-bold">{ssb.name}</p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <ShareActions url={url} text={`Rapor perkembangan ${p.fullName} (${period.name}) dari ${ssb.name}`} />
          <ThemeToggle />
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[19rem_1fr] print:block">
        <aside className="no-print hidden space-y-3 lg:sticky lg:top-6 lg:block">
          <section className="overflow-hidden rounded-2xl border border-slate-700/80 bg-linear-to-br from-hero via-hero-2 to-hero p-5 text-center text-white shadow-md">
            <Avatar name={p.fullName} photoUrl={p.photoUrl} className="mx-auto size-28 border-4 border-primary text-3xl" />
            <h2 className="mt-3 text-xl leading-tight font-black tracking-tight">{p.fullName}</h2>
            <p className="mt-1 text-sm font-bold text-emerald-400">{ssb.name}</p>
            <p className="text-xs text-slate-300">
              {[row.groupName, position].filter(Boolean).join(" · ")}
              {p.jerseyNumber ? ` · #${p.jerseyNumber}` : ""}
            </p>
            <dl className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-slate-700 bg-slate-800/60 p-3">
              {RUBRIC.map((g) => (
                <div key={g.key}>
                  <dt className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">{g.label.split(" ")[0]}</dt>
                  <dd className="text-lg font-black">{groupAverage(g, scores).toFixed(1)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 flex justify-between rounded-xl bg-primary px-3 py-2 text-xs font-bold">
              <span>Kehadiran latihan</span>
              <span>{attendance.held ? `${attendance.hadir}/${attendance.held} sesi (${attendance.rate}%)` : "Belum ada sesi"}</span>
            </p>
          </section>
          <p className="flex gap-2 rounded-2xl border border-line bg-card p-4 text-xs text-muted shadow-sm">
            <Lightbulb size={16} className="mt-0.5 shrink-0 text-izin" aria-hidden />
            Rapor ini bisa dibagikan ke keluarga lewat WA atau disimpan sebagai PDF.
          </p>
        </aside>

        <article className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm print:rounded-none print:border-0 print:shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-4 border-primary px-5 py-5 md:px-8">
            <div>
              <ClubHeader name={ssb.name} logoUrl={ssb.logoUrl} subtitle={ssb.homeGround ? `Homeground: ${ssb.homeGround}` : undefined} />
              <p className="eyebrow mt-4 text-primary!">Rapor perkembangan pemain</p>
            </div>
            <div className="sm:text-right">
              <p className="eyebrow">Periode penilaian</p>
              <p className="text-sm font-bold">{period.name}</p>
              <p className="text-xs text-muted">
                {formatDateId(period.startDate, { weekday: false })} – {formatDateId(period.endDate, { weekday: false })}
              </p>
            </div>
          </div>

          <section className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-5 md:px-8">
            <div className="flex min-w-0 items-center gap-4">
              <div className="lg:hidden">
                <Avatar name={p.fullName} photoUrl={p.photoUrl} className="size-16 text-xl" />
              </div>
              <div className="min-w-0">
                <p className="eyebrow">Nama lengkap pemain</p>
                <h1 className="text-xl font-black tracking-tight md:text-2xl">{p.fullName}</h1>
                <p className="mt-1 text-xs text-muted">
                  {meta.map(([k, v], i) => (
                    <span key={k}>
                      {i > 0 && " · "}
                      {k}: <b className="text-ink">{v}</b>
                    </span>
                  ))}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-line bg-subtle px-4 py-3 text-center">
                <p className="eyebrow">Disiplin presensi</p>
                <p className="text-xl font-black text-primary">{attendance.held ? `${attendance.rate}%` : "—"}</p>
                <p className="text-[10px] text-muted">{attendance.held ? `${attendance.hadir}/${attendance.held} sesi` : "Belum ada sesi"}</p>
              </div>
              <div className="rounded-xl border border-line bg-subtle px-4 py-3 text-center">
                <p className="eyebrow">Nilai rata-rata</p>
                <p className="text-xl font-black text-primary">{avg.toFixed(1)}</p>
                <p className="text-[10px] text-muted">/ 5.0 ({SCORE_LABEL[Math.round(avg)].toLowerCase()})</p>
              </div>
            </div>
          </section>

          <section className="space-y-5 border-b border-line px-5 py-6 md:px-8">
            <h2 className="eyebrow">Rincian penilaian kemampuan</h2>
            {RUBRIC.map((g, gi) => {
              const gavg = groupAverage(g, scores);
              const tone = TONE[gi % TONE.length]!;
              return (
                <div key={g.key} className="break-inside-avoid">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-sm font-bold">
                      <span className={cn("size-2.5 rounded-full", tone.dot)} aria-hidden />
                      {g.label}
                    </h3>
                    <span className={cn("shrink-0 text-sm font-black whitespace-nowrap", tone.text)}>{gavg.toFixed(1)} / 5.0</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-ground" role="img" aria-label={`Rata-rata ${gavg} dari 5`}>
                    <div className={cn("h-full rounded-full", tone.dot)} style={{ width: `${(gavg / 5) * 100}%` }} />
                  </div>
                  <ul className="mt-2.5 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted md:grid-cols-3">
                    {g.aspects.map((a) => (
                      <li key={a.key}>
                        {a.label}: <b className="text-ink">{scores[a.key] ?? DEFAULT_SCORE}</b>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            <p className="text-xs text-muted">Skala 1–5: 1 Perlu banyak latihan · 3 Cukup · 5 Sangat baik.</p>
          </section>

          {/* Evaluasi naratif = bagian yang paling dibaca ortu. */}
          <section className="space-y-3 px-5 py-6 md:px-8">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="eyebrow">Ulasan naratif pelatih</h2>
              {ssb.headCoachName && <p className="text-xs font-bold">{ssb.headCoachName}</p>}
            </div>
            {NARRATIVE_FIELDS.map((f) =>
              r[f.key].trim() ? (
                <div key={f.key} className="break-inside-avoid rounded-xl border border-line bg-subtle p-4">
                  <h3 className={cn("flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider uppercase", NARRATIVE_TONE[f.key])}>
                    <Check size={13} aria-hidden /> {f.label}
                  </h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed">{r[f.key]}</p>
                </div>
              ) : null
            )}
            {!hasNarrative && <p className="text-sm text-muted">Pelatih belum menulis catatan.</p>}
          </section>

          <footer className="flex flex-wrap items-end justify-between gap-4 border-t border-line bg-subtle px-5 py-5 text-sm md:px-8 print:bg-transparent">
            <p className="max-w-xs text-xs text-muted">Dokumen ini diterbitkan oleh {ssb.name} untuk keluarga {p.nickname || p.fullName}.</p>
            <div className="text-right">
              <p className="text-xs text-muted">Diterbitkan {r.publishedAt ? formatDateId(dateWib(r.publishedAt), { weekday: false }) : ""}</p>
              <p className="mt-5 font-serif text-base font-bold">{ssb.headCoachName ?? ssb.name}</p>
              <p className="text-xs text-muted">Pelatih Kepala {row.groupName}</p>
            </div>
          </footer>
        </article>
      </div>
    </main>
  );
}
