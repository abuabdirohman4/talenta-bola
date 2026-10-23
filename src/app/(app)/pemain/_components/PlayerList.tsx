"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { inputClass } from "@/components/ui/Field";
import { missingFields, POSITIONS, positionLabel } from "@/lib/players";
import { cn } from "@/lib/utils";

export type ReportState = "PUBLISHED" | "DRAFT" | "NONE";

type Row = {
  id: string;
  fullName: string;
  nickname: string | null;
  jerseyNumber: number | null;
  position: string | null;
  birthDate: string | null;
  parentName: string | null;
  parentPhoneWa: string | null;
  isActive: boolean;
  /** Persen hadir 30 hari terakhir; null = belum ada sesi tercatat. */
  rate: number | null;
  /** null = tidak ada periode rapor yang sedang berjalan. */
  report: ReportState | null;
};

const SHORT: Record<string, string> = { GK: "Kiper", DF: "Bek", MF: "Tengah", FW: "Depan" };
const REPORT_LABEL: Record<ReportState, string> = { PUBLISHED: "Terbit", DRAFT: "Draft", NONE: "Belum" };

// Daftar master puluhan baris: cari & saring di browser, tanpa bolak-balik ke server.
export function PlayerList({ players, importHref }: { players: Row[]; importHref: string }) {
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

  const filters = [
    { value: "", label: "Semua", n: players.length },
    ...POSITIONS.map((p) => ({ value: p.value, label: SHORT[p.value], n: players.filter((r) => r.position === p.value).length })),
    { value: "_kurang", label: "Data kurang", n: players.filter((r) => missingFields(r).length > 0).length },
  ];

  const term = q.trim().toLowerCase();
  const shown = players.filter(
    (p) =>
      (!term ||
        p.fullName.toLowerCase().includes(term) ||
        p.nickname?.toLowerCase().includes(term) ||
        p.parentName?.toLowerCase().includes(term) ||
        String(p.jerseyNumber) === term) &&
      (!pos || (pos === "_kurang" ? missingFields(p).length > 0 : p.position === pos))
  );

  return (
    <>
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block lg:w-80 lg:shrink-0">
          <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama, nomor punggung, atau nama ortu"
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
                pos === f.value ? "border-primary bg-primary text-white" : "border-line bg-subtle text-ink hover:border-muted/40"
              )}
            >
              {f.label} ({f.n})
            </button>
          ))}
        </div>
      </div>

      <ul className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((p) => {
          const missing = p.isActive ? missingFields(p) : [];
          return (
            <li key={p.id}>
              <Link
                href={`/pemain/${p.id}`}
                className={cn(
                  "block rounded-2xl border border-line bg-card p-4 shadow-sm hover:border-primary/40",
                  !p.isActive && "opacity-60"
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-ground text-lg font-black">
                    {p.jerseyNumber != null ? `#${p.jerseyNumber}` : "–"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{p.fullName}</p>
                    <p className="truncate text-xs font-medium text-muted">
                      {[positionLabel(p.position), p.parentName && `Ortu: ${p.parentName}`].filter(Boolean).join(" · ") || "Posisi belum ditentukan"}
                    </p>
                    {missing.length > 0 && <p className="text-[11px] font-semibold text-warn">Lengkapi: {missing.join(", ")}</p>}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold",
                      !p.isActive
                        ? "border-line bg-subtle text-muted"
                        : missing.length
                          ? "border-izin/30 bg-warn-soft text-warn"
                          : "border-hadir/30 bg-hadir/10 text-hadir"
                    )}
                  >
                    {!p.isActive ? "Nonaktif" : missing.length ? "Belum lengkap" : "Lengkap"}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5 text-xs text-muted">
                  <span>
                    Hadir: <b className="text-ink">{p.rate == null ? "—" : `${p.rate}%`}</b>
                  </span>
                  {p.report && (
                    <span>
                      Rapor: <b className={p.report === "PUBLISHED" ? "text-hadir" : "text-ink"}>{REPORT_LABEL[p.report]}</b>
                    </span>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
        {shown.length === 0 && (
          <li className="rounded-2xl border border-dashed border-line bg-card p-6 text-center text-muted md:col-span-2 xl:col-span-3">
            Tidak ada pemain yang cocok.
          </li>
        )}
      </ul>
    </>
  );
}
