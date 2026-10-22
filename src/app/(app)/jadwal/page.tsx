import { and, asc, count, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { ChevronRight, ClipboardCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { KuSwitcher } from "@/components/KuSwitcher";
import { buttonClass } from "@/components/ui/Button";
import { db } from "@/db";
import { attendances, players, trainingPatterns, trainingSessions } from "@/db/schema";
import { getActiveGroup } from "@/lib/data";
import { addDays, dateWib, formatDateId, formatTimeId } from "@/lib/format";
import { fillSessionsFromPatterns } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { CancelSessionButton } from "../presensi/_components/SessionControls";
import { NewSessionForm, PatternCard, PatternForm } from "./_components/JadwalForms";

export const metadata: Metadata = { title: "Jadwal" };

const card = "rounded-2xl border border-line bg-card shadow-sm";

export default async function JadwalPage({ searchParams }: { searchParams: Promise<{ ku?: string }> }) {
  const { ssb, groups, group } = await getActiveGroup((await searchParams).ku);
  if (!group) return <p className={cn(card, "border-dashed p-6 text-center")}>Belum ada kelompok umur. Tambahkan di Pengaturan.</p>;

  await fillSessionsFromPatterns(ssb.id, group.id, ssb.homeGround);
  const today = dateWib();
  const [patterns, sessions, [{ total }]] = await Promise.all([
    db
      .select()
      .from(trainingPatterns)
      .where(and(eq(trainingPatterns.ageGroupId, group.id), eq(trainingPatterns.ssbId, ssb.id), isNull(trainingPatterns.deletedAt))),
    db
      .select()
      .from(trainingSessions)
      .where(
        and(
          eq(trainingSessions.ageGroupId, group.id),
          eq(trainingSessions.ssbId, ssb.id),
          isNull(trainingSessions.deletedAt),
          gte(trainingSessions.sessionDate, addDays(today, -14)),
          lte(trainingSessions.sessionDate, addDays(today, 27))
        )
      )
      .orderBy(asc(trainingSessions.sessionDate)),
    db
      .select({ total: count() })
      .from(players)
      .where(and(eq(players.ageGroupId, group.id), eq(players.isActive, true), isNull(players.deletedAt))),
  ]);
  const held = sessions.filter((s) => s.sessionDate <= today).map((s) => s.id);
  const marks = held.length
    ? await db
        .select({
          sessionId: attendances.sessionId,
          filled: count(),
          hadir: sql<number>`count(*) filter (where ${attendances.status} = 'HADIR')`.mapWith(Number),
        })
        .from(attendances)
        .where(inArray(attendances.sessionId, held))
        .groupBy(attendances.sessionId)
    : [];
  const markBy = new Map(marks.map((m) => [m.sessionId, m]));
  // Senin dulu, Minggu terakhir — urutan minggu yang lazim di Indonesia.
  patterns.sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7));
  const scheduled = sessions.filter((s) => s.sessionDate >= today && s.status !== "CANCELLED").length;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-extrabold tracking-tight md:hidden">Jadwal {group.name}</h2>
      <KuSwitcher groups={groups} activeId={group.id} basePath="/jadwal" />

      <section className={cn(card, "space-y-3 p-4 md:p-5")}>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-primary" aria-hidden />
            <h3 className="text-xs font-black tracking-wider uppercase">Jadwal rutin mingguan</h3>
          </div>
          <p className="text-[11px] font-medium text-muted">Sesi 4 minggu ke depan dibuat otomatis</p>
        </div>
        {patterns.length ? (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {patterns.map((p, i) => (
              <PatternCard
                key={p.id}
                tone={i % 2 ? "info" : "primary"}
                pattern={{ id: p.id, ageGroupId: group.id, weekday: p.weekday, startTime: p.startTime.slice(0, 5), location: p.location ?? "", topic: p.topic ?? "" }}
              />
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">
            Belum ada jadwal rutin. Tambahkan hari latihan tetap — sesi 4 minggu ke depan terisi sendiri dan ortu bisa izin lebih awal.
          </p>
        )}
        <PatternForm ageGroupId={group.id} defaultLocation={ssb.homeGround ?? ""} />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div>
            <h3 className="text-xs font-black tracking-wider uppercase">Timeline sesi latihan</h3>
            <p className="text-[11px] font-medium text-muted">2 minggu terakhir & 4 minggu ke depan · {scheduled} sesi terjadwal</p>
          </div>
          <NewSessionForm ageGroupId={group.id} defaultLocation={ssb.homeGround ?? ""} />
        </div>

        {sessions.length === 0 ? (
          <p className={cn(card, "border-dashed p-6 text-center text-muted")}>
            Belum ada sesi. Tambahkan jadwal rutin atau tekan <b>Tambah sesi</b> untuk latihan tambahan.
          </p>
        ) : (
          <ul className="space-y-3">
            {sessions.map((s) => {
              const m = markBy.get(s.id);
              return (
                <SessionRow
                  key={s.id}
                  s={s}
                  when={s.sessionDate < today ? "past" : s.sessionDate === today ? "today" : "next"}
                  hadir={m?.hadir ?? 0}
                  filled={m?.filled ?? 0}
                  total={total}
                />
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function SessionRow({
  s,
  when,
  hadir,
  filled,
  total,
}: {
  s: typeof trainingSessions.$inferSelect;
  when: "past" | "today" | "next";
  hadir: number;
  filled: number;
  total: number;
}) {
  const cancelled = s.status === "CANCELLED";
  const month = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", month: "short" }).format(new Date(s.sessionDate + "T00:00:00Z"));
  const isToday = when === "today" && !cancelled;
  return (
    <li
      className={cn(
        "flex flex-col justify-between gap-3 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center",
        cancelled ? "border-alpa/30 bg-alpa/5" : isToday ? "border-2 border-primary bg-card shadow-md" : "border-line bg-card",
        when === "past" && "opacity-80 hover:opacity-100"
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            "grid shrink-0 place-items-center rounded-xl border text-center leading-none font-black",
            isToday ? "size-12 border-transparent bg-primary text-white shadow-sm" : "size-11",
            cancelled ? "border-alpa/30 bg-alpa/10 text-alpa" : !isToday && "border-line bg-ground text-muted"
          )}
        >
          <span>
            <span className="block text-sm">{s.sessionDate.slice(8, 10)}</span>
            <span className="block text-[8px] uppercase">{isToday ? "Hari ini" : month}</span>
          </span>
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h4 className={cn("font-bold", isToday ? "text-sm font-black" : "text-[13px]")}>
              {formatDateId(s.sessionDate)} · {formatTimeId(s.startTime)} WIB
            </h4>
            <Chip cancelled={cancelled} when={when} />
          </div>
          {cancelled ? (
            <p className="mt-0.5 text-xs font-semibold text-alpa">{s.cancelReason ? `Alasan: ${s.cancelReason}` : "Diliburkan pelatih"}</p>
          ) : (
            <p className={cn("mt-0.5 text-xs text-muted", isToday && "font-semibold")}>
              {[s.topic || "Latihan rutin", s.location].filter(Boolean).join(" · ")}
            </p>
          )}
          {!cancelled && when !== "next" && (
            <p className={cn("mt-0.5 text-[11px] font-bold", filled ? "text-primary" : "text-muted")}>
              {isToday
                ? `${hadir} dari ${total} anak sudah tercatat hadir`
                : filled
                  ? `Hadir: ${hadir}/${total} anak${total ? ` (${Math.round((hadir / total) * 100)}%)` : ""}`
                  : "Presensi belum diisi"}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {isToday && (
          <Link href={`/presensi/${s.id}`} className={buttonClass("primary", "md")}>
            <ClipboardCheck size={18} aria-hidden /> Catat presensi
          </Link>
        )}
        {when === "past" && !cancelled && (
          <Link href={`/presensi/${s.id}`} className={buttonClass("outline", "md")}>
            Lihat rekap
          </Link>
        )}
        {when === "next" && !cancelled && (
          <Link href={`/presensi/${s.id}`} className={buttonClass("outline", "md")}>
            Atur sesi <ChevronRight size={16} aria-hidden />
          </Link>
        )}
        {when !== "past" && <CancelSessionButton sessionId={s.id} cancelled={cancelled} subtle={when === "next"} />}
      </div>
    </li>
  );
}

function Chip({ cancelled, when }: { cancelled: boolean; when: "past" | "today" | "next" }) {
  const base = "rounded-md border px-1.5 py-0.5 text-[10px] font-extrabold uppercase";
  if (cancelled) return <span className={cn(base, "border-alpa/30 bg-alpa/10 text-alpa")}>✕ Diliburkan</span>;
  if (when === "today")
    return <span className={cn(base, "animate-pulse rounded-full border-primary/30 bg-primary-soft px-2 text-primary")}>● Sesi hari ini</span>;
  return <span className={cn(base, "border-line bg-ground text-muted")}>{when === "past" ? "Selesai" : "Mendatang"}</span>;
}
