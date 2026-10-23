"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDateId } from "@/lib/format";
import { monthGrid, shiftMonth } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { openSession } from "../actions";

export type DayInfo = { id: string; state: "done" | "planned" | "cancelled"; pct: number | null };

const DAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

/** Warna lingkaran = persen hadir sesi itu (ambang sama dengan kartu ringkasan lembar presensi). */
function tone(d: DayInfo): string {
  if (d.state === "cancelled") return "bg-ground text-muted line-through";
  if (d.state === "planned" || d.pct == null) return "border-2 border-dashed border-primary/60 text-ink";
  if (d.pct >= 80) return "bg-hadir text-white dark:text-ground";
  if (d.pct >= 60) return "bg-izin text-white dark:text-ground";
  return "bg-alpa text-white dark:text-ground";
}

export function PresensiCalendar({
  month,
  today,
  days,
  ageGroupId,
}: {
  month: string;
  today: string;
  days: Record<string, DayInfo>;
  ageGroupId: string;
}) {
  const [pick, setPick] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const label = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(month + "-01T00:00:00Z")
  );
  const nav = (n: number) => `/presensi?ku=${ageGroupId}&bulan=${shiftMonth(month, n)}`;

  return (
    <section className="rounded-2xl border border-line bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <Link href={nav(-1)} aria-label="Bulan sebelumnya" className="grid size-11 place-items-center rounded-xl hover:bg-ground">
          <ChevronLeft size={20} aria-hidden />
        </Link>
        <h3 className="text-base font-bold capitalize">{label}</h3>
        <Link href={nav(1)} aria-label="Bulan berikutnya" className="grid size-11 place-items-center rounded-xl hover:bg-ground">
          <ChevronRight size={20} aria-hidden />
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted">
        {DAY_LABELS.map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {monthGrid(month).map((date, i) => {
          if (!date) return <span key={i} aria-hidden />;
          const d = days[date];
          const n = Number(date.slice(8));
          const ring = date === today && "ring-2 ring-ink ring-offset-2 ring-offset-card";
          const circle = "mx-auto grid size-10 place-items-center rounded-full text-sm font-semibold";
          return d ? (
            <Link
              key={date}
              href={`/presensi/${d.id}`}
              aria-label={`${formatDateId(date)}: ${d.state === "cancelled" ? "libur" : d.pct == null ? "belum diisi" : `hadir ${d.pct}%`}`}
              className="py-0.5"
            >
              <span className={cn(circle, tone(d), ring)}>{n}</span>
            </Link>
          ) : (
            <button
              key={date}
              type="button"
              onClick={() => setPick(date)}
              aria-label={`${formatDateId(date)}: tidak ada sesi, buat sesi`}
              className="py-0.5"
            >
              <span className={cn(circle, "font-normal text-muted hover:bg-ground", ring)}>{n}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-muted">
        <Legend className="bg-hadir" label="≥80% hadir" />
        <Legend className="bg-izin" label="60–79%" />
        <Legend className="bg-alpa" label="<60%" />
        <Legend className="border-2 border-dashed border-primary/60" label="Terjadwal" />
      </div>

      <ConfirmDialog
        open={!!pick}
        title="Buat sesi latihan?"
        message={pick ? `Belum ada sesi pada ${formatDateId(pick)}. Buat sesinya lalu buka lembar presensi.` : ""}
        confirmLabel="Buat sesi"
        loading={pending}
        onClose={() => setPick(null)}
        onConfirm={() =>
          start(async () => {
            const r = await openSession({ ageGroupId, date: pick! });
            if (r?.error) toast.error(r.error);
          })
        }
      />
    </section>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn("size-2.5 rounded-full", className)} aria-hidden />
      {label}
    </span>
  );
}
