import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, lte, ne, or } from "drizzle-orm";
import {
  CalendarDays,
  ChartColumn,
  ClipboardCheck,
  Clock,
  FileText,
  MapPin,
  MessageSquareText,
  NotebookPen,
  TriangleAlert,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { attendances, players, reportPeriods, reports, trainingSessions } from "@/db/schema";
import { STATUS_LABEL, type Status } from "@/lib/attendance";
import { getActiveGroup } from "@/lib/data";
import { addDays, dateWib, formatDateId, formatTimeId } from "@/lib/format";
import { positionLabel } from "@/lib/players";
import { fillSessionsFromPatterns } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { InstallCard } from "./_components/InstallCard";
import { StartTodayButton } from "./presensi/_components/SessionControls";

const card = "rounded-2xl border border-line bg-card shadow-sm";

export default async function BerandaPage({ searchParams }: { searchParams: Promise<{ ku?: string }> }) {
  const { ssb, groups, group } = await getActiveGroup((await searchParams).ku);
  if (!group) {
    return (
      <p className={cn(card, "border-dashed p-6 text-center")}>
        Belum ada kelompok umur. <Link href="/pengaturan" className="font-semibold text-primary underline">Tambahkan di Pengaturan</Link>.
      </p>
    );
  }

  // Beranda paling sering dibuka: jaga sesi 4 minggu ke depan dari jadwal rutin tetap terisi.
  await fillSessionsFromPatterns(ssb.id, group.id, ssb.homeGround);
  const today = dateWib();
  const monthAgo = addDays(today, -30);
  const activePlayer = and(eq(players.ageGroupId, group.id), eq(players.isActive, true), isNull(players.deletedAt));
  const liveSession = and(
    eq(trainingSessions.ageGroupId, group.id),
    isNull(trainingSessions.deletedAt),
    ne(trainingSessions.status, "CANCELLED")
  );

  const [upcoming, [{ total }], [{ incomplete }], [{ fresh }], recentSessions, [last], [period]] = await Promise.all([
    db
      .select()
      .from(trainingSessions)
      .where(and(liveSession, gte(trainingSessions.sessionDate, today)))
      .orderBy(asc(trainingSessions.sessionDate))
      .limit(3),
    db.select({ total: count() }).from(players).where(activePlayer),
    db
      .select({ incomplete: count() })
      .from(players)
      .where(and(activePlayer, or(isNull(players.birthDate), isNull(players.parentPhoneWa)))),
    db
      .select({ fresh: count() })
      .from(players)
      .where(and(activePlayer, gte(players.createdAt, new Date(monthAgo + "T00:00:00+07:00")))),
    db
      .select({ id: trainingSessions.id })
      .from(trainingSessions)
      .where(and(liveSession, gte(trainingSessions.sessionDate, monthAgo), lte(trainingSessions.sessionDate, today))),
    // Sesi terakhir yang sudah ada isinya — sumber daftar "perlu perhatian".
    db
      .select({ id: trainingSessions.id, sessionDate: trainingSessions.sessionDate })
      .from(trainingSessions)
      .where(
        and(
          liveSession,
          lte(trainingSessions.sessionDate, today),
          inArray(trainingSessions.id, db.select({ id: attendances.sessionId }).from(attendances))
        )
      )
      .orderBy(desc(trainingSessions.sessionDate))
      .limit(1),
    db
      .select()
      .from(reportPeriods)
      .where(
        and(
          eq(reportPeriods.ageGroupId, group.id),
          isNull(reportPeriods.deletedAt),
          lte(reportPeriods.startDate, today),
          gte(reportPeriods.endDate, today)
        )
      )
      .orderBy(desc(reportPeriods.startDate))
      .limit(1),
  ]);

  const ids = recentSessions.map((s) => s.id);
  const [[hadir], [published], lastMarks] = await Promise.all([
    ids.length
      ? db.select({ n: count() }).from(attendances).where(and(inArray(attendances.sessionId, ids), eq(attendances.status, "HADIR")))
      : [{ n: 0 }],
    period
      ? db.select({ n: count() }).from(reports).where(and(eq(reports.periodId, period.id), isNotNull(reports.publishedAt)))
      : [{ n: 0 }],
    last
      ? db
          .select({
            status: attendances.status,
            note: attendances.note,
            id: players.id,
            name: players.fullName,
            jersey: players.jerseyNumber,
            position: players.position,
          })
          .from(attendances)
          .innerJoin(players, eq(players.id, attendances.playerId))
          .where(eq(attendances.sessionId, last.id))
      : [],
  ]);
  const rate = ids.length && total ? Math.round((hadir!.n / (ids.length * total)) * 1000) / 10 : null;
  const next = upcoming[0];
  const isToday = next?.sessionDate === today;
  const lastHadir = lastMarks.filter((m) => m.status === "HADIR").length;
  const attention = lastMarks.filter((m) => m.status !== "HADIR").slice(0, 6);
  const unrated = period ? total - published!.n : 0;

  return (
    <div className="space-y-6">
      <InstallCard />

      {/* Sorotan sesi berikutnya */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-700/80 bg-linear-to-br from-hero via-hero-2 to-hero p-5 text-white shadow-md md:p-6">
        {/* Pendar hijau di pojok — aksen gradasi merek di kartu gelap. */}
        <span aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-primary/30 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-28 left-1/3 size-56 rounded-full bg-primary-2/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="size-2 animate-ping rounded-full bg-emerald-400" />
              <span className="text-[10px] font-extrabold tracking-widest text-emerald-400 uppercase">
                {isToday ? "Latihan hari ini" : next ? "Jadwal sesi berikutnya" : "Belum ada jadwal"}
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-800 px-2 text-[10px] font-bold text-slate-300">
                {group.code}
                {group.birthYear ? ` (${group.birthYear})` : ""}
              </span>
            </div>
            <h2 className="text-lg font-black tracking-tight md:text-xl">
              {next?.topic || (next ? "Latihan Rutin" : "Mulai presensi kapan saja")}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs font-medium text-slate-300">
              <span className="flex items-center gap-1.5">
                <CalendarDays size={16} className="text-emerald-400" aria-hidden />
                {formatDateId(next?.sessionDate ?? today)}
              </span>
              {next && (
                <span className="flex items-center gap-1.5">
                  <Clock size={16} className="text-emerald-400" aria-hidden />
                  {formatTimeId(next.startTime)} WIB
                </span>
              )}
              {next?.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={16} className="text-emerald-400" aria-hidden />
                  {next.location}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            {isToday ? (
              <Link
                href={`/presensi/${next!.id}`}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-black text-white shadow-lg shadow-primary/30 hover:brightness-110"
              >
                <ClipboardCheck size={18} aria-hidden /> Presensi Lapangan
              </Link>
            ) : (
              <StartTodayButton
                ageGroupId={group.id}
                size="md"
                label="Presensi Lapangan"
                className="mt-0 w-auto shadow-lg shadow-primary/30"
              />
            )}
            <Link
              href={`/jadwal?ku=${group.id}`}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 text-sm font-bold text-white hover:bg-slate-700"
            >
              <CalendarDays size={18} aria-hidden /> Atur Jadwal
            </Link>
          </div>
        </div>
      </section>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Kpi href={`/pemain?ku=${group.id}`} icon={Users} tone="text-primary bg-primary-soft" label={`Total pemain ${group.code}`}>
          {total}
          <Note className="text-primary">{fresh ? `+${fresh} anak baru bulan ini` : group.name}</Note>
        </Kpi>
        <Kpi href={`/presensi?ku=${group.id}`} icon={ChartColumn} tone="text-info bg-info/10" label="Rata-rata presensi">
          {rate == null ? "—" : `${rate}%`}
          <Note>{ids.length ? `${ids.length} sesi · target > 85%` : "Belum ada sesi 30 hari"}</Note>
        </Kpi>
        <Kpi
          href={period ? `/rapor/${period.id}` : `/rapor?ku=${group.id}`}
          icon={FileText}
          tone="text-izin bg-izin/10"
          label="Progres rapor"
        >
          {period ? published!.n : "—"}
          {period && <span className="text-sm font-semibold text-muted"> / {total}</span>}
          <Note className="text-izin">{period ? (unrated ? `${unrated} anak belum terbit` : "Semua terbit") : "Belum ada periode"}</Note>
        </Kpi>
        <Kpi href={`/pemain?ku=${group.id}`} icon={UserCheck} tone="text-sakit bg-sakit/10" label="Data lengkap">
          {total - incomplete}
          <span className="text-sm font-semibold text-muted"> / {total}</span>
          <Note className={incomplete ? "text-alpa" : "text-primary"}>
            {incomplete ? `${incomplete} belum lengkap` : "Siap kirim link ortu"}
          </Note>
        </Kpi>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Perlu perhatian dari sesi terakhir */}
          <section className={cn(card, "space-y-3 p-5")}>
            <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
              <div>
                <h3 className="text-xs font-extrabold tracking-wider uppercase">Presensi terakhir & perlu perhatian</h3>
                <p className="text-[11px] font-medium text-muted">
                  {last ? `Sesi ${formatDateId(last.sessionDate)} · ${lastHadir}/${total} hadir` : "Belum ada sesi yang dicatat"}
                </p>
              </div>
              {last && (
                <Link href={`/presensi/${last.id}`} className="shrink-0 text-xs font-bold text-primary hover:underline">
                  Lihat semua →
                </Link>
              )}
            </div>
            {attention.length ? (
              <ul className="space-y-2">
                {attention.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/pemain/${m.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-line bg-subtle p-2.5 hover:border-muted/40"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ground text-xs font-black">
                          {m.jersey != null ? `#${m.jersey}` : "–"}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold">{m.name}</span>
                          <span className="block truncate text-[11px] font-medium text-muted">
                            {[positionLabel(m.position), group.code, m.note].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                      </span>
                      <StatusPill status={m.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl bg-subtle p-4 text-sm text-muted">
                {last ? "Semua anak hadir di sesi terakhir." : "Mulai presensi pertama — daftar anak yang izin, sakit, atau alpa akan muncul di sini."}
              </p>
            )}
          </section>

          {/* Agenda */}
          <section className={cn(card, "space-y-3 p-5")}>
            <h3 className="text-xs font-extrabold tracking-wider uppercase">Jadwal latihan berikutnya</h3>
            {upcoming.length ? (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {upcoming.map((s) => {
                  const today_ = s.sessionDate === today;
                  return (
                    <Link
                      key={s.id}
                      href={`/presensi/${s.id}`}
                      className={cn(
                        "rounded-xl border p-3",
                        today_ ? "border-primary/40 bg-primary-soft" : "border-line bg-subtle hover:border-muted/40"
                      )}
                    >
                      <span className={cn("text-[10px] font-bold uppercase", today_ ? "text-primary" : "text-muted")}>
                        {formatDateId(s.sessionDate)}
                        {today_ && " (hari ini)"}
                      </span>
                      <span className="mt-1 block text-sm font-extrabold">{s.topic || "Latihan Rutin"}</span>
                      <span className="mt-0.5 block text-[11px] text-muted">
                        {formatTimeId(s.startTime)} WIB{s.location ? ` · ${s.location}` : ""}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl bg-subtle p-4 text-sm text-muted">
                Belum ada jadwal ke depan.{" "}
                <Link href={`/jadwal?ku=${group.id}`} className="font-semibold text-primary underline">
                  Buat jadwal rutin mingguan
                </Link>{" "}
                supaya ortu bisa kirim izin lebih dulu.
              </p>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className={cn(card, "space-y-3 p-5")}>
            <h3 className="text-xs font-extrabold tracking-wider uppercase">Fitur pelatih</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <Shortcut href={`/presensi?ku=${group.id}`} icon={ClipboardCheck} tone="text-primary bg-primary-soft" title="Presensi" sub="Catat lapangan" />
              <Shortcut href={`/pemain?ku=${group.id}`} icon={Users} tone="text-primary bg-primary-soft" title="Data Pemain" sub="Profil & link ortu" />
              <Shortcut href={period ? `/rapor/${period.id}` : `/rapor?ku=${group.id}`} icon={NotebookPen} tone="text-info bg-info/10" title="Isi Rapor" sub="22 aspek bintang" />
              <Shortcut href="/pemain/impor" icon={MessageSquareText} tone="text-izin bg-izin/10" title="Impor WA" sub="Tempel daftar grup" />
            </div>
          </section>

          {incomplete > 0 && (
            <section className={cn(card, "space-y-2.5 p-5")}>
              <h3 className="text-xs font-extrabold tracking-wider uppercase">Catatan</h3>
              <Link
                href={`/pemain?ku=${group.id}`}
                className="flex gap-3 rounded-xl border border-izin/30 bg-warn-soft p-3.5 text-warn hover:border-izin/60"
              >
                <TriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden />
                <span className="text-[13px] leading-relaxed">
                  <b>{incomplete} pemain</b> belum lengkap (tanggal lahir / WA ortu). Lengkapi supaya link ortu & rapor bisa dikirim.
                </span>
              </Link>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({
  href,
  icon: Icon,
  tone,
  label,
  children,
}: {
  href: string;
  icon: typeof Users;
  tone: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn(card, "block p-4 hover:border-muted/40")}>
      <span className="mb-2 flex items-start justify-between gap-2">
        <span className="eyebrow">{label}</span>
        <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg", tone)}>
          <Icon size={16} aria-hidden />
        </span>
      </span>
      <span className="block text-2xl font-black tracking-tight">{children}</span>
    </Link>
  );
}

function Note({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("mt-1 block text-[11px] font-bold tracking-normal text-muted", className)}>{children}</span>;
}

const PILL: Record<Status, string> = {
  HADIR: "bg-hadir/10 text-hadir border-hadir/30",
  IZIN: "bg-izin/10 text-izin border-izin/30",
  SAKIT: "bg-sakit/10 text-sakit border-sakit/30",
  ALPA: "bg-alpa/10 text-alpa border-alpa/30",
};

function StatusPill({ status }: { status: Status }) {
  return (
    <span className={cn("shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold", PILL[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function Shortcut({
  href,
  icon: Icon,
  tone,
  title,
  sub,
}: {
  href: string;
  icon: typeof Users;
  tone: string;
  title: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-line bg-subtle p-3 text-center hover:border-primary/40 hover:bg-primary-soft"
    >
      <span className={cn("mx-auto mb-1.5 grid size-8 place-items-center rounded-lg transition-transform group-hover:scale-105", tone)}>
        <Icon size={16} aria-hidden />
      </span>
      <span className="block text-xs font-extrabold">{title}</span>
      <span className="block text-[10px] text-muted">{sub}</span>
    </Link>
  );
}
