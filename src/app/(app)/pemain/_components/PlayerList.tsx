"use client";

import { ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { inputClass } from "@/components/ui/Field";
import { Avatar } from "@/components/Avatar";
import { missingFields, POSITIONS, positionLabel } from "@/lib/players";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  fullName: string;
  nickname: string | null;
  jerseyNumber: number | null;
  position: string | null;
  birthDate: string | null;
  parentPhoneWa: string | null;
  photoUrl: string | null;
  isActive: boolean;
};

const FILTERS = [{ value: "", label: "Semua" }, ...POSITIONS, { value: "_kurang", label: "Data kurang" }];

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

  const term = q.trim().toLowerCase();
  const shown = players.filter(
    (p) =>
      (!term || p.fullName.toLowerCase().includes(term) || p.nickname?.toLowerCase().includes(term) || String(p.jerseyNumber) === term) &&
      (!pos || (pos === "_kurang" ? missingFields(p).length > 0 : p.position === pos))
  );

  return (
    <>
      <label className="relative block">
        <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama, panggilan, atau nomor punggung"
          className={inputClass + " pl-10"}
          aria-label="Cari pemain"
        />
      </label>
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setPos(f.value)}
            className={cn(
              "min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold",
              pos === f.value ? "border-primary bg-primary text-white" : "border-line bg-card"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
        {shown.map((p) => {
          const missing = missingFields(p);
          return (
            <li key={p.id}>
              <Link href={`/pemain/${p.id}`} className={cn("flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-ground", !p.isActive && "opacity-60")}>
                <Avatar name={p.fullName} photoUrl={p.photoUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">
                    {p.fullName}
                    {p.jerseyNumber ? <span className="font-semibold text-muted"> #{p.jerseyNumber}</span> : null}
                  </p>
                  <p className="truncate text-sm text-muted">
                    {!p.isActive
                      ? "Nonaktif"
                      : missing.length
                        ? <span className="text-warn">Lengkapi: {missing.join(", ")}</span>
                        : positionLabel(p.position)}
                  </p>
                </div>
                <ChevronRight size={18} className="text-muted" />
              </Link>
            </li>
          );
        })}
        {shown.length === 0 && <li className="p-6 text-center text-muted">Tidak ada pemain yang cocok.</li>}
      </ul>
    </>
  );
}
