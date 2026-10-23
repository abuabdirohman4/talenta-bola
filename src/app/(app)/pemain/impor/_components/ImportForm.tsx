"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { parseWaList } from "@/lib/wa-import";
import { importPlayers } from "../../actions";

const EXAMPLE = `Daftar siswa KU 2016
1. Athar ✅
2. Argya
7. Shiraj ❎ ijin`;

export function ImportForm({ groups, defaultGroupId }: { groups: { id: string; name: string }[]; defaultGroupId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [groupId, setGroupId] = useState(defaultGroupId);
  const [pending, start] = useTransition();
  const preview = parseWaList(text);

  return (
    <div className="max-w-3xl space-y-4">
      <div className="space-y-4 rounded-2xl border border-line bg-card p-5 shadow-sm">
      <Field label="Kelompok umur">
        <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className={inputClass}>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Tempel daftar dari WA">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={EXAMPLE}
          className={inputClass + " font-mono"}
        />
      </Field>
      </div>

      {preview.length > 0 && (
        <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
          <p className="text-xs font-extrabold tracking-wider uppercase">Terbaca {preview.length} nama</p>
          <ol className="mt-2 grid list-decimal grid-cols-2 gap-x-6 gap-y-1 pl-5 text-[15px] sm:grid-cols-3">
            {preview.map((p) => (
              <li key={p.fullName}>
                {p.fullName}
                {p.nickname && <span className="text-muted"> ({p.nickname})</span>}
              </li>
            ))}
          </ol>
        </section>
      )}

      <Button
        size="lg"
        className="w-full"
        disabled={!preview.length}
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await importPlayers(groupId, text);
            if (r.error) return void toast.error(r.error);
            toast.success(
              `${r.added.length} pemain ditambahkan` + (r.skipped.length ? `, ${r.skipped.length} sudah ada (dilewati)` : "")
            );
            router.push(`/pemain?ku=${groupId}`);
          })
        }
      >
        Impor {preview.length || ""} nama
      </Button>
    </div>
  );
}
