import { and, count, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { KuSwitcher } from "@/components/KuSwitcher";
import { db } from "@/db";
import { players, reportPeriods, reports } from "@/db/schema";
import { getActiveGroup } from "@/lib/data";
import { formatDateId } from "@/lib/format";
import { NewPeriodForm } from "./_components/NewPeriodForm";

export const metadata: Metadata = { title: "Rapor" };

export default async function RaporPage({ searchParams }: { searchParams: Promise<{ ku?: string }> }) {
  const { groups, group } = await getActiveGroup((await searchParams).ku);
  if (!group) return <p>Belum ada kelompok umur. Tambahkan di Pengaturan.</p>;

  const [periods, [{ total }]] = await Promise.all([
    db
      .select()
      .from(reportPeriods)
      .where(and(eq(reportPeriods.ageGroupId, group.id), isNull(reportPeriods.deletedAt)))
      .orderBy(desc(reportPeriods.startDate)),
    db
      .select({ total: count() })
      .from(players)
      .where(and(eq(players.ageGroupId, group.id), eq(players.isActive, true), isNull(players.deletedAt))),
  ]);
  const ids = periods.map((p) => p.id);
  const [filled, published] = ids.length
    ? await Promise.all([
        db.select({ id: reports.periodId, n: count() }).from(reports).where(inArray(reports.periodId, ids)).groupBy(reports.periodId),
        db
          .select({ id: reports.periodId, n: count() })
          .from(reports)
          .where(and(inArray(reports.periodId, ids), isNotNull(reports.publishedAt)))
          .groupBy(reports.periodId),
      ])
    : [[], []];
  const filledBy = new Map(filled.map((f) => [f.id, f.n]));
  const pubBy = new Map(published.map((f) => [f.id, f.n]));

  return (
    <div className="space-y-6">
      <KuSwitcher groups={groups} activeId={group.id} basePath="/rapor" />
      <div>
        <p className="eyebrow">Evaluasi & rapor</p>
        <h2 className="text-xl font-black tracking-tight">Rapor {group.name}</h2>
      </div>

      {periods.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-card p-6 text-center text-muted">
          Belum ada periode rapor. Buat satu di bawah (mis. per tiga bulan), lalu nilai anak satu per satu.
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {periods.map((p) => {
            const done = filledBy.get(p.id) ?? 0;
            const pub = pubBy.get(p.id) ?? 0;
            return (
              <li key={p.id}>
                <Link href={`/rapor/${p.id}`} className="block rounded-2xl border border-line bg-card p-5 shadow-sm hover:border-muted/40">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-black tracking-tight">{p.name}</p>
                      <p className="text-xs font-medium text-muted">
                        {formatDateId(p.startDate, { weekday: false })} – {formatDateId(p.endDate, { weekday: false })}
                      </p>
                    </div>
                    <ChevronRight className="text-muted" />
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-ground" aria-hidden>
                    <div className="h-full rounded-full bg-brand" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold">
                    <span>
                      Dinilai {done}/{total}
                    </span>
                    <span className="rounded-md border border-primary/30 bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary">
                      Terbit {pub}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <NewPeriodForm ageGroupId={group.id} />
    </div>
  );
}
