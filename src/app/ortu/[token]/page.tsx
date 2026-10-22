import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte } from "drizzle-orm";
import { CalendarDays, ChevronRight, Clock, FileText, MapPin, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { ClubHeader } from "@/components/ClubHeader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { db } from "@/db";
import { ageGroups, parentPermissions, players, reportPeriods, reports, ssbProfiles, trainingSessions } from "@/db/schema";
import { STATUS_LABEL } from "@/lib/attendance";
import { addDays, formatDateId, formatTimeId, dateWib } from "@/lib/format";
import { getAttendanceSummary } from "@/lib/queries";
import { cn, waLink } from "@/lib/utils";
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
      .select({ token: reports.publicToken, periodName: reportPeriods.name, publishedAt: reports.publishedAt })
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
    <main className="brand mx-auto min-h-dvh max-w-2xl space-y-4 px-4 py-5" style={{ "--color-primary": ssb.primaryColor } as React.CSSProperties}>
      <div className="flex items-center justify-between gap-3">
        <ClubHeader name={ssb.name} logoUrl={ssb.logoUrl} subtitle="Halaman orang tua" />
        <ThemeToggle />
      </div>

      <section className="flex items-center gap-4 overflow-hidden rounded-2xl border border-slate-700/80 bg-linear-to-br from-hero via-hero-2 to-hero p-5 text-white shadow-md">
        <Avatar name={p.fullName} photoUrl={p.photoUrl} className="size-16 border-2 border-primary text-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold tracking-widest text-emerald-400 uppercase">Pemain</p>
          <h1 className="text-xl font-black tracking-tight">{p.fullName}</h1>
          <p className="text-xs font-medium text-slate-300">{row.groupName}</p>
        </div>
        {attendance.rate != null && (
          <div className="shrink-0 text-right">
            <p className="text-2xl font-black text-emerald-400">{attendance.rate}%</p>
            <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Kehadiran</p>
          </div>
        )}
      </section>

      <nav className="flex gap-2 overflow-x-auto text-xs font-bold" aria-label="Isi halaman">
        {[
          ["#jadwal", "Jadwal"],
          ["#izin", "Izin / sakit"],
          ["#riwayat", "Riwayat hadir"],
          ["#rapor", "Rapor"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="shrink-0 rounded-full border border-line bg-card px-3 py-1.5 text-ink shadow-sm hover:bg-ground">
            {label}
          </a>
        ))}
      </nav>

      <section id="jadwal" className="scroll-mt-4 rounded-2xl border border-line bg-card p-5 shadow-sm">
        <h2 className="text-xs font-extrabold tracking-wider uppercase">Jadwal latihan</h2>
        {upcoming.length ? (
          <ul className="mt-3 space-y-2">
            {upcoming.slice(0, 4).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-subtle p-3">
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-bold">
                    <CalendarDays size={15} className="shrink-0 text-primary" aria-hidden />
                    {formatDateId(s.sessionDate)}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Clock size={13} aria-hidden /> {formatTimeId(s.startTime)} WIB
                    </span>
                    {s.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={13} aria-hidden /> {s.location}
                      </span>
                    )}
                  </span>
                </span>
                {s.status === "CANCELLED" ? (
                  <span className="shrink-0 rounded-md border border-alpa/30 bg-alpa/10 px-2 py-0.5 text-[11px] font-bold text-alpa">Libur</span>
                ) : permBy.get(s.id) ? (
                  <span className="shrink-0 rounded-md border border-izin/30 bg-izin/10 px-2 py-0.5 text-[11px] font-bold text-izin">
                    {STATUS_LABEL[permBy.get(s.id)!.type]} terkirim
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[15px] text-muted">Belum ada jadwal latihan dalam 3 minggu ke depan.</p>
        )}
      </section>

      <section id="izin" className="scroll-mt-4 rounded-2xl border border-line bg-card p-5 shadow-sm">
        <h2 className="text-xs font-extrabold tracking-wider uppercase">Izin / sakit</h2>
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

      <section id="riwayat" className="scroll-mt-4 rounded-2xl border border-line bg-card p-5 shadow-sm">
        <h2 className="text-xs font-extrabold tracking-wider uppercase">Riwayat kehadiran</h2>
        {attendance.held ? (
          <>
            <p className="mt-1 text-[15px]">
              Hadir <b>{attendance.hadir}</b> dari {attendance.held} latihan yang sudah dicatat
              {attendance.rate != null && <span className="text-muted"> ({attendance.rate}%)</span>}
            </p>
            <ul className="mt-3 divide-y divide-line rounded-xl border border-line" aria-label="Kehadiran latihan terakhir">
              {[...attendance.recent].reverse().map((s) => (
                <li key={s.date} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <span className="font-semibold">{formatDateId(s.date)}</span>
                  <span className="flex items-center gap-1.5 text-xs font-bold">
                    <span className={cn("size-2.5 rounded-full", s.status ? DOT[s.status] : "bg-belum")} aria-hidden />
                    {s.status ? STATUS_LABEL[s.status] : "Belum dicatat"}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-1 text-[15px] text-muted">Belum ada latihan yang dicatat pelatih. Riwayat muncul setelah presensi pertama.</p>
        )}
      </section>

      <section id="rapor" className="scroll-mt-4 rounded-2xl border border-line bg-card p-5 shadow-sm">
        <h2 className="text-xs font-extrabold tracking-wider uppercase">Rapor perkembangan</h2>
        {published.length ? (
          <ul className="mt-2 space-y-2">
            {published.map((r) => (
              <li key={r.token}>
                <Link
                  href={`/r/${r.token}`}
                  className="flex min-h-14 items-center gap-3 rounded-xl border border-primary/30 bg-primary-soft px-3 text-primary"
                >
                  <FileText size={20} className="shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{r.periodName}</span>
                    {r.publishedAt && (
                      <span className="block text-xs text-muted">Terbit {formatDateId(dateWib(r.publishedAt), { weekday: false })}</span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center text-xs font-bold">
                    Buka <ChevronRight size={16} aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[15px] text-muted">Rapor akan muncul di sini setelah pelatih menerbitkannya.</p>
        )}
      </section>

      {ssb.phoneWa && (
        <a
          href={waLink(`Halo pengurus ${ssb.name}, saya orang tua ${p.fullName}. `, ssb.phoneWa)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-card text-sm font-bold text-ink shadow-sm hover:bg-ground"
        >
          <MessageCircle size={18} className="text-primary" aria-hidden /> Hubungi pengurus klub
        </a>
      )}

      <p className="pt-2 text-center text-xs text-muted">Link ini khusus untuk keluarga {p.nickname || p.fullName}. Mohon tidak dibagikan ke grup.</p>
    </main>
  );
}
