import { and, asc, count, desc, eq, gte, inArray, isNull, lte, ne } from "drizzle-orm";
import { FileInput, FileText, Layers, UserCheck, UserPlus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { KuSwitcher } from "@/components/KuSwitcher";
import { buttonClass } from "@/components/ui/Button";
import { db } from "@/db";
import { attendances, players, reportPeriods, reports, trainingSessions } from "@/db/schema";
import { getActiveGroup } from "@/lib/data";
import { addDays, dateWib } from "@/lib/format";
import { missingFields, POSITIONS } from "@/lib/players";
import { cn } from "@/lib/utils";
import { PlayerList, type ReportState } from "./_components/PlayerList";

export const metadata: Metadata = { title: "Pemain" };

const card = "rounded-2xl border border-line bg-card shadow-sm";
/** Dua tombol aksi berbagi satu baris di HP 360px tanpa teks terlipat. */
const MOBILE_BTN = "flex-1 whitespace-nowrap px-3 text-sm sm:flex-none sm:px-4 sm:text-[15px]";
const SHORT: Record<string, string> = { GK: "Kiper", DF: "Bek", MF: "Tengah", FW: "Depan" };

export default async function PemainPage({ searchParams }: { searchParams: Promise<{ ku?: string }> }) {
  const { groups, group } = await getActiveGroup((await searchParams).ku);
  if (!group) return <p>Belum ada kelompok umur. Tambahkan di Pengaturan.</p>;

  const today = dateWib();
  const recent = and(
    eq(trainingSessions.ageGroupId, group.id),
    isNull(trainingSessions.deletedAt),
    ne(trainingSessions.status, "CANCELLED"),
    gte(trainingSessions.sessionDate, addDays(today, -30)),
    lte(trainingSessions.sessionDate, today),
    inArray(trainingSessions.id, db.select({ id: attendances.sessionId }).from(attendances))
  );

  const [rows, [period], [{ sessions }], hadirRows] = await Promise.all([
    db
      .select({
        id: players.id,
        fullName: players.fullName,
        nickname: players.nickname,
        jerseyNumber: players.jerseyNumber,
        position: players.position,
        birthDate: players.birthDate,
        parentName: players.parentName,
        parentPhoneWa: players.parentPhoneWa,
        isActive: players.isActive,
      })
      .from(players)
      .where(and(eq(players.ageGroupId, group.id), isNull(players.deletedAt)))
      .orderBy(asc(players.sortOrder), asc(players.fullName)),
    db
      .select({ id: reportPeriods.id, name: reportPeriods.name })
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
    db.select({ sessions: count() }).from(trainingSessions).where(recent),
    db
      .select({ playerId: attendances.playerId, n: count() })
      .from(attendances)
      .where(and(eq(attendances.status, "HADIR"), inArray(attendances.sessionId, db.select({ id: trainingSessions.id }).from(trainingSessions).where(recent))))
      .groupBy(attendances.playerId),
  ]);

  const reportRows = period
    ? await db
        .select({ playerId: reports.playerId, publishedAt: reports.publishedAt })
        .from(reports)
        .where(eq(reports.periodId, period.id))
    : [];
  const hadir = new Map(hadirRows.map((r) => [r.playerId, r.n]));
  const reportOf = new Map(reportRows.map((r) => [r.playerId, r.publishedAt ? "PUBLISHED" : "DRAFT"] as const));

  const list = rows.map((p) => ({
    ...p,
    rate: sessions ? Math.round(((hadir.get(p.id) ?? 0) / sessions) * 100) : null,
    report: (period ? (reportOf.get(p.id) ?? "NONE") : null) as ReportState | null,
  }));

  const active = rows.filter((r) => r.isActive);
  const complete = active.filter((r) => missingFields(r).length === 0).length;
  const published = active.filter((r) => reportOf.get(r.id) === "PUBLISHED").length;
  const byPos =
    POSITIONS.map((p) => [active.filter((r) => r.position === p.value).length, SHORT[p.value]] as const)
      .filter(([n]) => n > 0)
      .map(([n, l]) => `${n} ${l}`)
      .join(" · ") || "Belum ada posisi terisi";
  const noPos = active.filter((r) => !r.position).length;

  return (
    <div className="space-y-5">
      <KuSwitcher groups={groups} activeId={group.id} basePath="/pemain" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold tracking-tight md:hidden">Data pemain</h2>
        <p className="hidden text-sm font-medium text-muted md:block">{group.name}</p>
        <div className="flex w-full gap-2 sm:w-auto">
          <Link href={`/pemain/impor?ku=${group.id}`} className={buttonClass("outline", "md", MOBILE_BTN)}>
            <FileInput size={18} aria-hidden /> Impor dari WA
          </Link>
          <Link href={`/pemain/baru?ku=${group.id}`} className={buttonClass("primary", "md", MOBILE_BTN)}>
            <UserPlus size={18} aria-hidden /> Tambah Pemain
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Stat icon={Users} tone="text-primary bg-primary-soft" label="Total pemain terdaftar">
          {active.length} <span className="text-base font-bold text-muted">Anak</span>
          <Note className="text-primary">{group.name}</Note>
        </Stat>
        <Stat icon={Layers} tone="text-info bg-info/10" label="Komposisi posisi">
          <span className="block text-sm leading-snug font-black">{byPos}</span>
          <Note>{noPos ? `${noPos} belum ditentukan` : "Semua sudah ditentukan"}</Note>
        </Stat>
        <Stat icon={FileText} tone="text-izin bg-izin/10" label="Status rapor periode aktif">
          {period ? published : "—"}
          {period && <span className="text-base font-semibold text-muted"> / {active.length}</span>}
          <Note className="text-izin">{period ? `${period.name} · terbit` : "Belum ada periode"}</Note>
        </Stat>
        <Stat icon={UserCheck} tone="text-sakit bg-sakit/10" label="Data lengkap">
          {complete}
          <span className="text-base font-semibold text-muted"> / {active.length}</span>
          <Note className={active.length - complete ? "text-alpa" : "text-primary"}>
            {active.length - complete ? `${active.length - complete} belum lengkap` : "Siap kirim link ortu"}
          </Note>
        </Stat>
      </div>

      <PlayerList players={list} importHref={`/pemain/impor?ku=${group.id}`} />
    </div>
  );
}

function Stat({
  icon: Icon,
  tone,
  label,
  children,
}: {
  icon: typeof Users;
  tone: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(card, "p-4")}>
      <span className="mb-2 flex items-start justify-between gap-2">
        <span className="eyebrow">{label}</span>
        <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg", tone)}>
          <Icon size={16} aria-hidden />
        </span>
      </span>
      <span className="block text-2xl font-black tracking-tight">{children}</span>
    </div>
  );
}

function Note({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("mt-1 block text-[11px] font-bold tracking-normal text-muted", className)}>{children}</span>;
}
