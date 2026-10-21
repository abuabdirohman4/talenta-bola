import { and, asc, eq, isNull } from "drizzle-orm";
import { ChevronRight, Play } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { BackLink } from "@/components/BackLink";
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
    <>
      <BackLink href={`/rapor?ku=${period.ageGroupId}`}>Semua periode</BackLink>
      <h2 className="text-2xl font-extrabold tracking-tight">{period.name}</h2>
      <p className="mb-4 text-muted">
        Dinilai {done} dari {rows.length} anak. Tip demo: mulai 5–10 anak dulu.
      </p>
      {next && (
        <Link href={`/rapor/${period.id}/${next.id}`} className={buttonClass("primary", "lg", "mb-5 w-full")}>
          <Play size={20} aria-hidden /> {done ? "Lanjutkan" : "Mulai"} dari {next.fullName}
        </Link>
      )}
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
        {rows.map((r, i) => (
          <li key={r.id}>
            <Link href={`/rapor/${period.id}/${r.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-ground">
              <span className="w-6 text-center text-sm font-bold text-muted">{i + 1}</span>
              <Avatar name={r.fullName} photoUrl={r.photoUrl} />
              <p className="min-w-0 flex-1 truncate font-bold">{r.fullName}</p>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-bold",
                  r.publishedAt ? "bg-primary-soft text-hadir" : r.reportId ? "bg-warn-soft text-warn" : "bg-ground text-muted"
                )}
              >
                {r.publishedAt ? "Terbit" : r.reportId ? "Draf" : "Belum dinilai"}
              </span>
              <ChevronRight size={18} className="text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
