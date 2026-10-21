import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte } from "drizzle-orm";
import { FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { ClubHeader } from "@/components/ClubHeader";
import { db } from "@/db";
import { ageGroups, parentPermissions, players, reportPeriods, reports, ssbProfiles, trainingSessions } from "@/db/schema";
import { STATUS_LABEL } from "@/lib/attendance";
import { addDays, formatDateId, formatTimeId, dateWib } from "@/lib/format";
import { getAttendanceSummary } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { IzinForm } from "./_components/IzinForm";

export const metadata: Metadata = { title: "Halaman orang tua" };

const DOT: Record<string, string> = {
  HADIR: "bg-hadir",
  IZIN: "bg-izin",
  SAKIT: "bg-sakit",
  ALPA: "bg-alpa",
};

export default async function ParentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) notFound();

  const [row] = await db
    .select({ p: players, ssb: ssbProfiles, groupName: ageGroups.name })
    .from(players)
    .innerJoin(ssbProfiles, eq(ssbProfiles.id, players.ssbId))
    .innerJoin(ageGroups, eq(ageGroups.id, players.ageGroupId))
    .where(and(eq(players.parentToken, token), isNull(players.deletedAt)));
  if (!row) notFound();
  const { p, ssb } = row;

  const today = dateWib();
  const [upcoming, attendance, published] = await Promise.all([
    db
      .select()
      .from(trainingSessions)
      .where(
        and(
          eq(trainingSessions.ageGroupId, p.ageGroupId),
          isNull(trainingSessions.deletedAt),
          gte(trainingSessions.sessionDate, today),
          lte(trainingSessions.sessionDate, addDays(today, 21))
        )
      )
      .orderBy(asc(trainingSessions.sessionDate)),
    getAttendanceSummary(p.id, p.ageGroupId),
    db
      .select({ token: reports.publicToken, periodName: reportPeriods.name })
      .from(reports)
      .innerJoin(reportPeriods, eq(reportPeriods.id, reports.periodId))
      .where(and(eq(reports.playerId, p.id), isNotNull(reports.publishedAt)))
      .orderBy(desc(reportPeriods.startDate)),
  ]);
  const perms = upcoming.length
    ? await db
        .select()
        .from(parentPermissions)
        .where(and(eq(parentPermissions.playerId, p.id), inArray(parentPermissions.sessionId, upcoming.map((s) => s.id))))
        .orderBy(desc(parentPermissions.createdAt))
    : [];
  const permBy = new Map<string, (typeof perms)[number]>();
  for (const x of perms) if (!permBy.has(x.sessionId)) permBy.set(x.sessionId, x);

  return (
    <main className="brand mx-auto min-h-dvh max-w-xl px-4 py-6" style={{ "--color-primary": ssb.primaryColor } as React.CSSProperties}>
      <ClubHeader name={ssb.name} logoUrl={ssb.logoUrl} subtitle="Halaman orang tua" />

      <section className="mt-6 flex items-center gap-4 rounded-2xl border border-line bg-card p-4">
        <Avatar name={p.fullName} photoUrl={p.photoUrl} className="size-16 text-xl" />
        <div>
          <h1 className="text-xl font-extrabold">{p.fullName}</h1>
          <p className="text-muted">{row.groupName}</p>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-card p-4">
        <h2 className="font-bold">Kehadiran latihan</h2>
        {attendance.held ? (
          <>
            <p className="mt-1 text-[15px]">
              Hadir <b>{attendance.hadir}</b> dari {attendance.held} sesi
              {attendance.rate != null && <span className="text-muted"> ({attendance.rate}%)</span>}
            </p>
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Kehadiran sesi terakhir">
              {attendance.recent.map((s) => (
                <li key={s.date} className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-sm">
                  <span className={cn("size-2.5 rounded-full", s.status ? DOT[s.status] : "bg-belum")} aria-hidden />
                  {formatDateId(s.date, { weekday: false }).replace(/ \d{4}$/, "")} · {s.status ? STATUS_LABEL[s.status] : "Belum diisi"}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-1 text-muted">Belum ada sesi latihan yang tercatat.</p>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-card p-4">
        <h2 className="font-bold">Izin / sakit</h2>
        {upcoming.filter((s) => s.status !== "CANCELLED").length === 0 ? (
          <p className="mt-1 text-[15px] text-muted">
            Belum ada jadwal latihan dalam 3 minggu ke depan. Kalau anak berhalangan, kabari pelatih lewat WA.
          </p>
        ) : (
          <IzinForm
            token={token}
            sessions={upcoming.map((s) => ({
              id: s.id,
              label: `${formatDateId(s.sessionDate)} · ${formatTimeId(s.startTime)}`,
              cancelled: s.status === "CANCELLED",
              sent: permBy.get(s.id) ? `${STATUS_LABEL[permBy.get(s.id)!.type]}: ${permBy.get(s.id)!.reason}` : null,
            }))}
          />
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-card p-4">
        <h2 className="font-bold">Rapor perkembangan</h2>
        {published.length ? (
          <ul className="mt-2 space-y-2">
            {published.map((r) => (
              <li key={r.token}>
                <Link
                  href={`/r/${r.token}`}
                  className="flex min-h-12 items-center gap-2 rounded-xl bg-primary-soft px-3 font-semibold text-primary"
                >
                  <FileText size={18} aria-hidden /> {r.periodName}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[15px] text-muted">Rapor akan muncul di sini setelah pelatih menerbitkannya.</p>
        )}
      </section>

      <p className="mt-6 text-center text-sm text-muted">Link ini khusus untuk keluarga {p.nickname || p.fullName}. Mohon tidak dibagikan ke grup.</p>
    </main>
  );
}
