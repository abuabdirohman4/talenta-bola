import { and, asc, eq, isNull } from "drizzle-orm";
import { ChevronRight, Play } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { buttonClass } from "@/components/ui/Button";
import { db } from "@/db";
import { players, reportPeriods, reports } from "@/db/schema";
import { getSsb } from "@/lib/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Rapor periode" };

export default async function PeriodPage({ params }: { params: Promise<{ periodId: string }> }) {
  const { periodId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(periodId)) notFound();
  const ssb = await getSsb();
  const [period] = await db
    .select()
    .from(reportPeriods)
    .where(and(eq(reportPeriods.id, periodId), eq(reportPeriods.ssbId, ssb.id), isNull(reportPeriods.deletedAt)));
  if (!period) notFound();

  const rows = await db
    .select({
      id: players.id,
      fullName: players.fullName,
      photoUrl: players.photoUrl,
      reportId: reports.id,
      publishedAt: reports.publishedAt,
    })
    .from(players)
    .leftJoin(reports, and(eq(reports.playerId, players.id), eq(reports.periodId, period.id)))
    .where(and(eq(players.ageGroupId, period.ageGroupId), eq(players.isActive, true), isNull(players.deletedAt)))
    .orderBy(asc(players.sortOrder), asc(players.fullName));

  const next = rows.find((r) => !r.reportId) ?? rows.find((r) => !r.publishedAt);
  const done = rows.filter((r) => r.reportId).length;

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Periode rapor</p>
        <h2 className="text-xl font-black tracking-tight">{period.name}</h2>
        <p className="mt-1 text-sm text-muted">
          Dinilai {done} dari {rows.length} anak. Tip demo: mulai 5–10 anak dulu.
        </p>
        <div className="mt-3 h-2 max-w-md overflow-hidden rounded-full bg-ground" aria-hidden>
          <div className="h-full rounded-full bg-brand" style={{ width: `${rows.length ? (done / rows.length) * 100 : 0}%` }} />
        </div>
      </div>
      {next && (
        <Link href={`/rapor/${period.id}/${next.id}`} className={buttonClass("primary", "lg", "w-full md:w-auto")}>
          <Play size={20} aria-hidden /> {done ? "Lanjutkan" : "Mulai"} dari {next.fullName}
        </Link>
      )}
      <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
        <h3 className="mb-3 text-xs font-extrabold tracking-wider uppercase">Roster periode</h3>
        <ul className="grid gap-2 md:grid-cols-2">
          {rows.map((r, i) => (
            <li key={r.id}>
              <Link
                href={`/rapor/${period.id}/${r.id}`}
                className="flex min-h-14 items-center gap-3 rounded-xl border border-line bg-subtle p-2.5 hover:border-muted/40"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ground text-xs font-black">{i + 1}</span>
                <Avatar name={r.fullName} photoUrl={r.photoUrl} className="size-9" />
                <p className="min-w-0 flex-1 truncate text-sm font-bold">{r.fullName}</p>
                <span
                  className={cn(
                    "shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold",
                    r.publishedAt
                      ? "border-primary/30 bg-primary-soft text-primary"
                      : r.reportId
                        ? "border-izin/30 bg-izin/10 text-izin"
                        : "border-line bg-ground text-muted"
                  )}
                >
                  {r.publishedAt ? "Terbit" : r.reportId ? "Draf" : "Belum dinilai"}
                </span>
                <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
