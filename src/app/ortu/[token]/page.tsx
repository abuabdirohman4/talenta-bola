import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte } from "drizzle-orm";
import { CalendarDays, ChevronRight, ClipboardCheck, Clock, FileText, MapPin, MessageCircle, UserRound } from "lucide-react";
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
import { fillSessionsFromPatterns, getAttendanceSummary } from "@/lib/queries";
import { footLabel, positionLabel } from "@/lib/players";
import { cn, waLink } from "@/lib/utils";
import { IzinForm } from "./_components/IzinForm";
import { ParentTabs } from "./_components/ParentTabs";

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

  // Ortu bisa membuka link berminggu-minggu setelah pelatih terakhir buka app; jadwal rutin tetap mengisi sesi (idempoten).
  await fillSessionsFromPatterns(ssb.id, p.ageGroupId, ssb.homeGround);
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

  const age = p.birthDate ? Math.floor((Date.parse(today) - Date.parse(p.birthDate)) / (365.2425 * 864e5)) : null;
  const profile: [string, React.ReactNode][] = [
    ["Nama lengkap", p.fullName],
    ["Panggilan", p.nickname],
    ["Kelompok umur", row.groupName],
    ["Nomor punggung", p.jerseyNumber != null ? `#${p.jerseyNumber}` : null],
    ["Posisi", positionLabel(p.position)],
    ["Kaki dominan", footLabel(p.preferredFoot)],
    ["Tanggal lahir", p.birthDate ? `${formatDateId(p.birthDate, { weekday: false })}${age != null ? ` (${age} tahun)` : ""}` : null],
    ["Tinggi badan", p.heightCm ? `${p.heightCm} cm` : null],
    ["Berat badan", p.weightKg ? `${p.weightKg} kg` : null],
    ["Orang tua / wali", p.parentName],
  ];
  const h2 = "text-xs font-extrabold tracking-wider uppercase";

  return (
    <main className="brand mx-auto min-h-dvh max-w-2xl space-y-4 px-4 py-5" style={{ "--color-primary": ssb.primaryColor } as React.CSSProperties}>
      <div className="flex items-center justify-between gap-3">
        <ClubHeader name={ssb.name} logoUrl={ssb.logoUrl} subtitle="Halaman orang tua" />
        <ThemeToggle />
      </div>

      {/* Kartu anak memakai warna klub (bukan kartu gelap) supaya serasi dengan halaman terang & logo. */}
      <section className="relative flex items-center gap-4 overflow-hidden rounded-2xl bg-linear-to-br from-primary to-primary-dark p-5 text-white shadow-md shadow-primary/20">
        <span aria-hidden className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-white/10" />
        <span aria-hidden className="pointer-events-none absolute -right-20 -bottom-24 size-56 rounded-full border-[14px] border-white/10" />
        <Avatar name={p.fullName} photoUrl={p.photoUrl} className="relative size-16 bg-white text-xl text-primary ring-4 ring-white/30" />
        <div className="relative min-w-0 flex-1">
          <h1 className="text-xl leading-tight font-black tracking-tight">{p.fullName}</h1>
          <p className="mt-0.5 text-sm font-medium text-white/85">
            {[row.groupName, p.jerseyNumber != null ? `#${p.jerseyNumber}` : null, positionLabel(p.position)].filter(Boolean).join(" · ")}
          </p>
        </div>
        {attendance.rate != null && (
          <div className="relative shrink-0 text-right">
            <p className="text-2xl font-black">{attendance.rate}%</p>
            <p className="text-[10px] font-bold tracking-wider text-white/75 uppercase">Kehadiran</p>
          </div>
        )}
      </section>

      <ParentTabs
        tabs={[
          {
            id: "jadwal",
            label: "Jadwal & izin",
            icon: <CalendarDays size={20} aria-hidden />,
            content: (
              <div className="space-y-6">
                <section>
                  <h2 className={h2}>Jadwal latihan</h2>
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
                            {s.status === "CANCELLED" ? (
                              <span className="mt-1 block text-xs font-semibold text-alpa">
                                Latihan diliburkan{s.cancelReason ? `: ${s.cancelReason}` : ""} — tidak perlu izin.
                              </span>
                            ) : (
                              s.topic && <span className="mt-1 block text-xs font-semibold text-primary">Fokus: {s.topic}</span>
                            )}
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
                <section className="border-t border-line pt-5">
                  <h2 className={h2}>Kirim izin / sakit</h2>
                  {upcoming.filter((s) => s.status !== "CANCELLED").length === 0 ? (
                    <p className="mt-1 text-[15px] text-muted">Kalau anak berhalangan, kabari pelatih lewat WA.</p>
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
              </div>
            ),
          },
          {
            id: "kehadiran",
            label: "Kehadiran",
            icon: <ClipboardCheck size={20} aria-hidden />,
            content: attendance.held ? (
              <>
                <h2 className={h2}>Riwayat kehadiran</h2>
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
              <p className="text-[15px] text-muted">Belum ada latihan yang dicatat pelatih. Riwayat muncul setelah presensi pertama.</p>
            ),
          },
          {
            id: "rapor",
            label: "Rapor",
            icon: <FileText size={20} aria-hidden />,
            content: published.length ? (
              <>
                <h2 className={h2}>Rapor perkembangan</h2>
                <ul className="mt-3 space-y-2">
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
              </>
            ) : (
              <p className="text-[15px] text-muted">Rapor akan muncul di sini setelah pelatih menerbitkannya.</p>
            ),
          },
          {
            id: "profil",
            label: "Profil",
            icon: <UserRound size={20} aria-hidden />,
            content: (
              <>
                <h2 className={h2}>Profil pemain</h2>
                <dl className="mt-3 divide-y divide-line rounded-xl border border-line">
                  {profile.map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-4 px-3 py-2.5 text-sm">
                      <dt className="shrink-0 text-muted">{k}</dt>
                      <dd className={cn("text-right font-semibold", !v && "font-normal text-muted")}>{v || "Belum diisi"}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-xs text-muted">Ada data yang salah atau kosong? Kabari pelatih atau pengurus klub supaya rapor anak lengkap.</p>
              </>
            ),
          },
        ]}
      />

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
