"use client";

import { CalendarPlus, CalendarRange, Play } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { cn } from "@/lib/utils";
import { openSession, scheduleWeekly } from "../actions";

export function StartTodayButton({
  ageGroupId,
  className,
  label = "Mulai presensi hari ini",
  size = "lg",
}: {
  ageGroupId: string;
  className?: string;
  label?: string;
  size?: "md" | "lg";
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      size={size}
      className={cn("mt-3 w-full", className)}
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await openSession({ ageGroupId });
          if (r?.error) toast.error(r.error);
        })
      }
    >
      {!pending && <Play size={size === "lg" ? 20 : 16} aria-hidden />}
      {label}
    </Button>
  );
}

export function NewSessionForm({ ageGroupId, defaultLocation }: { ageGroupId: string; defaultLocation: string }) {
  const [pending, start] = useTransition();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("07:30");
  const [location, setLocation] = useState(defaultLocation);

  return (
    <details className="group py-1">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-[15px] font-bold text-primary hover:underline">
        <CalendarPlus size={18} aria-hidden /> Jadwalkan sesi tanggal lain
      </summary>
      <form
        className="mt-3 grid gap-3 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await openSession({ ageGroupId, date, startTime: time, location });
            if (r?.error) toast.error(r.error);
          });
        }}
      >
        <Field label="Tanggal" required>
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Jam mulai">
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Lokasi">
          <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} />
        </Field>
        <Button type="submit" loading={pending} className="sm:col-span-3">
          Buat sesi
        </Button>
      </form>
    </details>
  );
}

const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

/** Jadwal rutin beberapa minggu sekaligus — supaya ortu bisa mengajukan izin sebelum hari latihan. */
export function WeeklyScheduleForm({ ageGroupId, defaultLocation }: { ageGroupId: string; defaultLocation: string }) {
  const [pending, start] = useTransition();
  const [days, setDays] = useState<number[]>([0]);
  const [time, setTime] = useState("07:30");
  const [location, setLocation] = useState(defaultLocation);
  const [weeks, setWeeks] = useState(4);

  return (
    <details className="group py-1">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-[15px] font-bold text-primary hover:underline">
        <CalendarRange size={18} aria-hidden /> Buat jadwal rutin mingguan
      </summary>
      <form
        className="mt-3 grid gap-3 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await scheduleWeekly({ ageGroupId, weekdays: days, startTime: time, location, weeks });
            if (r.error) return void toast.error(r.error);
            toast.success(r.created ? `${r.created} sesi dijadwalkan` : "Semua tanggal itu sudah punya sesi");
          });
        }}
      >
        <fieldset className="sm:col-span-3">
          <legend className="mb-1.5 text-sm font-semibold">Hari latihan</legend>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((d, i) => {
              const on = days.includes(i);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setDays((xs) => (on ? xs.filter((x) => x !== i) : [...xs, i]))}
                  className={
                    "min-h-11 min-w-12 rounded-xl border px-3 font-bold " +
                    (on ? "border-primary bg-primary text-white" : "border-line bg-subtle")
                  }
                >
                  {d}
                </button>
              );
            })}
          </div>
        </fieldset>
        <Field label="Jam mulai">
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Lokasi">
          <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Untuk berapa minggu">
          <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className={inputClass}>
            {[2, 4, 8, 12].map((w) => (
              <option key={w} value={w}>
                {w} minggu
              </option>
            ))}
          </select>
        </Field>
        <Button type="submit" loading={pending} className="sm:col-span-3">
          Buat jadwal
        </Button>
      </form>
    </details>
  );
}
