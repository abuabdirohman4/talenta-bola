"use client";

import { ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { inputClass } from "@/components/ui/Field";
import { STATUS_LABEL, type Status } from "@/lib/attendance";
import { formatDateId } from "@/lib/format";
import { footLabel, missingFields, POSITIONS, positionLabel } from "@/lib/players";
import { cn } from "@/lib/utils";

export type ReportState = "PUBLISHED" | "DRAFT" | "NONE";

type Row = {
  id: string;
  fullName: string;
  nickname: string | null;
  jerseyNumber: number | null;
  position: string | null;
  preferredFoot: string | null;
  birthDate: string | null;
  parentName: string | null;
  parentPhoneWa: string | null;
  isActive: boolean;
  /** URL foto (route berkache) atau null = siluet. */
  photo: string | null;
  /** Persen hadir 30 hari terakhir; null = belum ada sesi tercatat. */
  rate: number | null;
  /** 5 latihan terakhir yang diisi, lama → baru. */
  form: { date: string; status: Status }[];
  /** Rata-rata skor rapor terbit terbaru (1–5). */
  rating: number | null;
  /** null = tidak ada periode rapor yang sedang berjalan. */
  report: ReportState | null;
};

const REPORT_LABEL: Record<ReportState, string> = { PUBLISHED: "Terbit", DRAFT: "Draft", NONE: "Belum" };
/** Ambang sama dengan kalender presensi. */
const rateTone = (r: number) => (r >= 80 ? "text-hadir" : r >= 60 ? "text-izin" : "text-alpa");
const DOT: Record<Status, string> = { HADIR: "bg-hadir", IZIN: "bg-izin", SAKIT: "bg-sakit", ALPA: "bg-alpa" };
/** Tingkat kartu FIFA: emas ≥4, perak ≥3, perunggu di bawahnya — tidak ada merah untuk nilai anak. */
const ratingTone = (r: number) =>
  r >= 4
    ? "bg-linear-to-br from-gold to-gold-2 text-[#3d2a00]"
    : r >= 3
      ? "bg-linear-to-br from-silver to-silver-2 text-[#1e293b]"
      : "bg-linear-to-br from-bronze to-bronze-2 text-[#2e1503]";
/** Kolom tabel: HP = no · foto · nama · form · hadir; sm + nilai & rapor; desktop + panah. */
const COLS =
  "grid grid-cols-[1.75rem_2.75rem_minmax(0,1fr)_3rem_2.75rem] items-center gap-x-2.5 px-3 sm:grid-cols-[1.75rem_2.75rem_minmax(0,1fr)_4.5rem_3rem_2.75rem_3.25rem] lg:grid-cols-[2rem_3rem_minmax(0,1fr)_6rem_4rem_4rem_4.5rem_1rem] lg:gap-x-5 lg:px-5";

function age(birthDate: string | null) {
  if (!birthDate) return null;
  const [y, m, d] = birthDate.split("-").map(Number);
  const now = new Date();
  return now.getFullYear() - y - (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d) ? 1 : 0);
}

/** Foto kotak ala kartu pemain; tanpa foto = siluet orang. */
function PlayerPhoto({ src }: { src: string | null }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" loading="lazy" className="size-11 rounded-lg bg-ground object-cover lg:size-12" />
  ) : (
    <svg viewBox="0 0 48 48" aria-hidden className="size-11 rounded-lg bg-ground text-muted/35 lg:size-12">
      <circle cx="24" cy="18" r="8.5" fill="currentColor" />
      <path d="M7 48c1.5-10 8.5-15.5 17-15.5S39.5 38 41 48z" fill="currentColor" />
    </svg>
  );
}

// Daftar master puluhan baris: cari & saring di browser, tanpa bolak-balik ke server.
export function PlayerList({ players, importHref, periodName }: { players: Row[]; importHref: string; periodName: string | null }) {
  const [q, setQ] = useState("");
  const [pos, setPos] = useState("");

  if (players.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-card p-6 text-center">
        <p className="font-semibold">Belum ada pemain di kelompok ini.</p>
        <p className="mt-1 text-muted">
          Cara tercepat: salin daftar presensi dari grup WA, lalu{" "}
          <Link href={importHref} className="font-semibold text-primary underline">
            impor sekaligus
          </Link>
          .
        </p>
      </div>
    );
  }

  const incomplete = players.filter((r) => r.isActive && missingFields(r).length > 0).length;
  const filters = [
    { value: "", label: "Semua", n: players.length },
    ...POSITIONS.map((p) => ({ value: p.value, label: p.label, n: players.filter((r) => r.position === p.value).length })),
    ...(incomplete ? [{ value: "_kurang", label: "Data kurang", n: incomplete }] : []),
  ];

  const term = q.trim().toLowerCase();
  const shown = players.filter(
    (p) =>
      (!term ||
        p.fullName.toLowerCase().includes(term) ||
        p.nickname?.toLowerCase().includes(term) ||
        p.parentName?.toLowerCase().includes(term) ||
        String(p.jerseyNumber) === term) &&
      (!pos || (pos === "_kurang" ? p.isActive && missingFields(p).length > 0 : p.position === pos))
  );
  // Tanpa saringan: dikelompokkan per posisi seperti daftar skuad; dengan saringan: satu daftar.
  const groups =
    pos || term
      ? [{ label: null as string | null, rows: shown }]
      : [...POSITIONS.map((p) => ({ label: p.label as string | null, rows: shown.filter((r) => r.position === p.value) })), { label: "Posisi belum diisi", rows: shown.filter((r) => !r.position) }].filter((g) => g.rows.length);

  return (
    <>
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block lg:w-80 lg:shrink-0">
          <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama, nomor, atau ortu"
            className={inputClass + " bg-subtle pl-10"}
            aria-label="Cari pemain"
          />
        </label>
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-0.5 lg:mx-0 lg:flex-wrap lg:justify-end lg:overflow-visible lg:px-0 lg:pb-0">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setPos(f.value)}
              className={cn(
                "min-h-11 shrink-0 rounded-full border px-4 text-sm font-bold",
                pos === f.value ? "border-primary bg-primary text-white" : "border-line bg-subtle text-ink hover:border-muted/40",
                f.value === "_kurang" && pos !== f.value && "text-warn"
              )}
            >
              {f.label} ({f.n})
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
        <div className={cn(COLS, "border-b border-line bg-subtle py-2.5 text-[11px] font-bold tracking-wide text-muted uppercase")}>
          <span className="text-center">No</span>
          <span className="col-span-2">Pemain</span>
          <span className="text-center">
            <span className="sm:hidden">Form</span>
            <span className="hidden sm:inline">5 latihan</span>
          </span>
          <span className="text-right">Hadir</span>
          <span className="hidden text-center sm:block">Nilai</span>
          <span className="hidden text-right sm:block" title={periodName ?? undefined}>
            Rapor
          </span>
          <span className="hidden lg:block" />
        </div>
        {groups.map((g) => (
          <section key={g.label ?? "all"}>
            {g.label && (
              <h3 className="border-b border-line bg-ground/60 px-3 py-1.5 text-xs font-extrabold tracking-wide lg:px-5">
                {g.label} <span className="font-semibold text-muted">· {g.rows.length}</span>
              </h3>
            )}
            <ul className="divide-y divide-line">
              {g.rows.map((p) => {
                const missing = p.isActive ? missingFields(p) : [];
                const a = age(p.birthDate);
                const foot = footLabel(p.preferredFoot);
                const info = [!g.label && positionLabel(p.position), a != null && `${a} th`, foot && (p.preferredFoot === "BOTH" ? foot : `Kaki ${foot.toLowerCase()}`)]
                  .filter(Boolean)
                  .join(" · ");
                const sub = !p.isActive ? "Nonaktif" : missing.length ? `Lengkapi: ${missing.join(", ")}` : info || null;
                return (
                  <li key={p.id}>
                    <Link href={`/pemain/${p.id}`} className={cn(COLS, "min-h-16 py-2 hover:bg-subtle", !p.isActive && "opacity-60")}>
                      <span className="mx-auto grid size-7 place-items-center rounded-full bg-ink text-xs font-black text-card lg:size-8 lg:text-sm">
                        {p.jerseyNumber ?? "–"}
                      </span>
                      <span className="relative">
                        <PlayerPhoto src={p.photo} />
                        {/* HP: kolom Nilai disembunyikan, nilai jadi lencana di pojok foto ala kartu FIFA. */}
                        {p.rating != null && (
                          <span
                            className={cn("absolute -right-1 -bottom-1 rounded px-1 text-[10px] leading-4 font-black tabular-nums ring-2 ring-card sm:hidden", ratingTone(p.rating))}
                            aria-label={`Nilai rapor ${p.rating.toFixed(1)}`}
                          >
                            {p.rating.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-bold">{p.fullName}</span>
                        {sub && <span className={cn("block truncate text-xs", missing.length ? "font-semibold text-warn" : "text-muted")}>{sub}</span>}
                      </span>
                      <span
                        className="flex justify-center gap-[3px] sm:gap-1"
                        aria-label={`5 latihan terakhir: ${p.form.map((f) => STATUS_LABEL[f.status]).join(", ")}`}
                      >
                        {p.form.map((f) => (
                          <span key={f.date} title={`${formatDateId(f.date)}: ${STATUS_LABEL[f.status]}`} className={cn("size-1.5 rounded-full sm:size-2.5", DOT[f.status])} />
                        ))}
                      </span>
                      <span className={cn("text-right text-sm font-bold tabular-nums", p.rate == null ? "text-muted" : rateTone(p.rate))}>
                        {p.rate == null ? "—" : `${p.rate}%`}
                      </span>
                      <span className="hidden justify-center sm:flex">
                        {p.rating != null ? (
                          <span className={cn("grid h-7 w-9 place-items-center rounded-md text-sm font-black tabular-nums", ratingTone(p.rating))}>
                            {p.rating.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                          </span>
                        ) : (
                          <span className="text-sm text-muted">—</span>
                        )}
                      </span>
                      <span className={cn("hidden text-right text-xs font-semibold sm:block", p.report === "PUBLISHED" ? "text-hadir" : "text-muted")}>
                        {p.report ? REPORT_LABEL[p.report] : "—"}
                      </span>
                      <ChevronRight size={16} className="hidden text-muted lg:block" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {shown.length === 0 && <p className="p-6 text-center text-muted">Tidak ada pemain yang cocok.</p>}
      </div>
    </>
  );
}
