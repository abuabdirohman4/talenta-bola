"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { createPeriod } from "../actions";

export function NewPeriodForm({ ageGroupId }: { ageGroupId: string }) {
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [startDate, setStart] = useState("");
  const [endDate, setEnd] = useState("");

  return (
    <details className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-extrabold text-primary">
        <Plus size={18} aria-hidden /> Buat periode rapor baru
      </summary>
      <form
        className="mt-3 grid gap-3 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await createPeriod({ ageGroupId, name, startDate, endDate });
            if (r?.error) return void toast.error(r.error);
            toast.success("Periode dibuat");
            setName("");
          });
        }}
      >
        <Field label="Nama periode" required className="sm:col-span-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Periode Jan–Mar 2027" className={inputClass} required />
        </Field>
        <Field label="Mulai" required>
          <input type="date" value={startDate} onChange={(e) => setStart(e.target.value)} className={inputClass} required />
        </Field>
        <Field label="Selesai" required>
          <input type="date" value={endDate} onChange={(e) => setEnd(e.target.value)} className={inputClass} required />
        </Field>
        <Button type="submit" loading={pending} className="self-end">
          Buat periode
        </Button>
      </form>
    </details>
  );
}
