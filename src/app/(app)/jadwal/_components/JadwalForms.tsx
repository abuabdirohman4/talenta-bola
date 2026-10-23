"use client";

import { CalendarPlus, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, inputClass } from "@/components/ui/Field";
import { WEEKDAY_NAMES } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { openSession } from "../../presensi/actions";
import { deletePattern, savePattern } from "../actions";

type Pattern = { id?: string; ageGroupId: string; weekday: number; startTime: string; location: string; topic: string };

const ABBR = ["MG", "SN", "SL", "RB", "KM", "JM", "SB"];
// Senin dulu, Minggu terakhir.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function PatternFields({ initial, onDone }: { initial: Pattern; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [weekday, setWeekday] = useState(initial.weekday);
  const [time, setTime] = useState(initial.startTime);
  const [location, setLocation] = useState(initial.location);
  const [topic, setTopic] = useState(initial.topic);

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await savePattern({ ...initial, weekday, startTime: time, location, topic });
          if (r?.error) return void toast.error(r.error);
          toast.success("Jadwal rutin disimpan — sesi 4 minggu ke depan sudah dibuat");
          onDone();
        });
      }}
    >
      <Field label="Hari latihan" required>
        <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} className={inputClass}>
          {WEEK_ORDER.map((d) => (
            <option key={d} value={d}>
              {WEEKDAY_NAMES[d]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Jam mulai" required>
        <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
      </Field>
      <Field label="Lokasi">
        <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} />
      </Field>
      <Field label="Fokus latihan (opsional)">
        <input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={120} placeholder="mis. Passing & SSG 4v4" className={inputClass} />
      </Field>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" loading={pending}>
          Simpan jadwal
        </Button>
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Batal
        </Button>
      </div>
    </form>
  );
}

export function PatternForm({ ageGroupId, defaultLocation }: { ageGroupId: string; defaultLocation: string }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center gap-2 text-[15px] font-bold text-primary hover:underline"
      >
        <Plus size={18} aria-hidden /> Tambah jadwal rutin
      </button>
    );
  }
  return (
    <div className="rounded-xl border border-line bg-subtle p-3">
      <PatternFields
        initial={{ ageGroupId, weekday: 0, startTime: "07:30", location: defaultLocation, topic: "" }}
        onDone={() => setOpen(false)}
      />
    </div>
  );
}

export function PatternCard({ pattern, tone }: { pattern: Pattern & { id: string }; tone: "primary" | "info" }) {
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const name = WEEKDAY_NAMES[pattern.weekday];

  if (editing) {
    return (
      <li className="rounded-xl border border-primary/40 bg-subtle p-3 sm:col-span-2">
        <PatternFields initial={pattern} onDone={() => setEditing(false)} />
      </li>
    );
  }
  return (
    <li className="flex items-start gap-3 rounded-xl border border-line bg-subtle p-3">
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-xl text-xs font-black",
          tone === "primary" ? "bg-primary-soft text-primary" : "bg-info/10 text-info"
        )}
      >
        {ABBR[pattern.weekday]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-extrabold">Setiap {name}</p>
        <p className="text-[11px] text-muted">
          {pattern.startTime.replace(":", ".")} WIB{pattern.location ? ` · ${pattern.location}` : ""}
        </p>
        {pattern.topic && (
          <p className={cn("mt-0.5 text-[11px] font-bold", tone === "primary" ? "text-primary" : "text-info")}>Fokus: {pattern.topic}</p>
        )}
      </div>
      <div className="-my-1 -mr-1 flex shrink-0">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Ubah jadwal ${name}`}
          className="grid size-10 place-items-center rounded-xl text-muted hover:bg-ground hover:text-ink"
        >
          <Pencil size={16} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setConfirm(true)}
          aria-label={`Hapus jadwal ${name}`}
          className="grid size-10 place-items-center rounded-xl text-muted hover:bg-alpa/10 hover:text-alpa"
        >
          <Trash2 size={16} aria-hidden />
        </button>
      </div>
      <ConfirmDialog
        open={confirm}
        title={`Hapus jadwal rutin ${name}?`}
        message="Sesi mendatang yang belum ada presensi atau izin ortu ikut dihapus. Riwayat sesi yang sudah lewat tetap tersimpan."
        confirmLabel="Hapus jadwal"
        danger
        loading={pending}
        onConfirm={() =>
          start(async () => {
            const r = await deletePattern(pattern.id);
            if (r?.error) toast.error(r.error);
            else toast.success(`Jadwal ${name} dihapus`);
            setConfirm(false);
          })
        }
        onClose={() => setConfirm(false)}
      />
    </li>
  );
}

/** Sesi tambahan di luar jadwal rutin (latihan ekstra, pengganti libur). */
