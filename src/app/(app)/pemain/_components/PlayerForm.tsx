"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ImagePicker } from "@/components/ImagePicker";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, inputClass } from "@/components/ui/Field";
import { FEET, POSITIONS, toNum, type PlayerFormData } from "@/lib/players";
import { validatePlayer } from "@/lib/validation/player";
import { deletePlayer, savePlayer } from "../actions";

type Group = { id: string; name: string; birthYear: number | null };

export function PlayerForm({ initial, groups }: { initial: PlayerFormData; groups: Group[] }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = <K extends keyof PlayerFormData>(k: K, v: PlayerFormData[K]) => {
    setF((prev) => ({ ...prev, [k]: v }));
    setServerErrors((e) => ({ ...e, [k]: "" }));
  };

  // Validasi yang sama dengan server, dijalankan saat mengetik supaya kesalahan terlihat sebelum simpan.
  const group = groups.find((g) => g.id === f.ageGroupId);
  const live = validatePlayer({
    fullName: f.fullName,
    birthDate: f.birthDate || null,
    heightCm: toNum(f.heightCm),
    weightKg: toNum(f.weightKg),
    jerseyNumber: toNum(f.jerseyNumber),
    parentPhoneWa: f.parentPhoneWa,
    ageGroupBirthYear: group?.birthYear,
  });
  const err = (k: string) => serverErrors[k] || (touched || k !== "fullName" ? live.errors[k] : undefined);
  const back = `/pemain?ku=${f.ageGroupId}`;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!live.ok) return toast.error("Periksa isian yang ditandai merah");
    startSave(async () => {
      const r = await savePlayer(f);
      if (!r.ok) {
        setServerErrors(r.errors);
        toast.error("Belum tersimpan — periksa isian");
        return;
      }
      toast.success(f.id ? "Data pemain diperbarui" : "Pemain ditambahkan");
      router.push(back);
    });
  }

  const num = { inputMode: "decimal" as const, className: inputClass };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <section className="space-y-4 rounded-2xl border border-line bg-card p-4">
        <ImagePicker name={f.fullName} value={f.photoUrl} onChange={(v) => set("photoUrl", v)} />
        <Field label="Nama lengkap" required error={err("fullName")}>
          <input value={f.fullName} onChange={(e) => set("fullName", e.target.value)} className={inputClass} autoComplete="off" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Panggilan">
            <input value={f.nickname} onChange={(e) => set("nickname", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Kelompok umur" required error={err("ageGroupId")}>
            <select value={f.ageGroupId} onChange={(e) => set("ageGroupId", e.target.value)} className={inputClass}>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tanggal lahir" error={err("birthDate")} warning={live.warnings.birthDate}>
            <input type="date" value={f.birthDate} onChange={(e) => set("birthDate", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Nomor punggung" error={err("jerseyNumber")}>
            <input {...num} inputMode="numeric" value={f.jerseyNumber} onChange={(e) => set("jerseyNumber", e.target.value)} />
          </Field>
          <Field label="Posisi">
            <select value={f.position} onChange={(e) => set("position", e.target.value)} className={inputClass}>
              <option value="">— Belum ditentukan —</option>
              {POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kaki dominan">
            <select value={f.preferredFoot} onChange={(e) => set("preferredFoot", e.target.value)} className={inputClass}>
              <option value="">— Belum diketahui —</option>
              {FEET.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tinggi (cm)" error={err("heightCm")}>
            <input {...num} value={f.heightCm} onChange={(e) => set("heightCm", e.target.value)} placeholder="mis. 135" />
          </Field>
          <Field label="Berat (kg)" error={err("weightKg")}>
            <input {...num} value={f.weightKg} onChange={(e) => set("weightKg", e.target.value)} placeholder="mis. 30" />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-line bg-card p-4">
        <h3 className="font-bold">Orang tua / wali</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama orang tua">
            <input value={f.parentName} onChange={(e) => set("parentName", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Nomor WA" error={err("parentPhoneWa")} hint="Dipakai untuk mengirim link izin & rapor">
            <input
              type="tel"
              inputMode="tel"
              value={f.parentPhoneWa}
              onChange={(e) => set("parentPhoneWa", e.target.value)}
              placeholder="0812 3456 7890"
              className={inputClass}
            />
          </Field>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={f.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="size-5 accent-[var(--color-primary)]"
          />
          <span className="font-semibold">Masih aktif berlatih</span>
          <span className="text-sm text-muted">(nonaktif = tidak muncul di presensi)</span>
        </label>
      </section>

      <div className="flex flex-wrap justify-between gap-2">
        {f.id ? (
          <Button type="button" variant="ghost" className="text-alpa" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={18} aria-hidden /> Hapus pemain
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.push(back)} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" loading={saving}>
            Simpan
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        danger
        title={`Hapus ${f.fullName}?`}
        message="Pemain hilang dari daftar dan presensi. Riwayat presensi & rapor yang sudah ada tetap tersimpan."
        confirmLabel="Hapus"
        loading={deleting}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() =>
          startDelete(async () => {
            const r = await deletePlayer(f.id!);
            if (r?.error) return void toast.error(r.error);
            toast.error(`${f.fullName} dihapus`);
            router.push(back);
          })
        }
      />
    </form>
  );
}
