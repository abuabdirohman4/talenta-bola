"use client";

import { Eye, EyeOff, KeyRound, LogOut, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ImagePicker } from "@/components/ImagePicker";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, inputClass } from "@/components/ui/Field";
import { signOut } from "@/app/masuk/actions";
import { addAgeGroup, changeAccessCode, updateSsb } from "../actions";

type Ssb = { name: string; headCoachName: string; homeGround: string; phoneWa: string; primaryColor: string; logoUrl: string };

export function SsbForm({ initial }: { initial: Ssb }) {
  const [f, setF] = useState(initial);
  const [pending, start] = useTransition();
  const set = (k: keyof Ssb, v: string) => setF((p) => ({ ...p, [k]: v }));

  return (
    <form
      className="space-y-4 rounded-2xl border border-line bg-card p-5 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await updateSsb(f);
          if (r?.error) return void toast.error(r.error);
          toast.success("Profil SSB disimpan");
        });
      }}
    >
      <h3 className="text-xs font-extrabold tracking-wider uppercase">Profil SSB</h3>
      <ImagePicker name={f.name} value={f.logoUrl} onChange={(v) => set("logoUrl", v)} label="Logo" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama SSB" required>
          <input value={f.name} onChange={(e) => set("name", e.target.value)} className={inputClass} required />
        </Field>
        <Field label="Nama pelatih kepala" hint="Tampil sebagai tanda tangan di rapor">
          <input value={f.headCoachName} onChange={(e) => set("headCoachName", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Lapangan latihan utama">
          <input value={f.homeGround} onChange={(e) => set("homeGround", e.target.value)} className={inputClass} />
        </Field>
        <Field label="WA pengurus / admin klub" hint="Muncul sebagai tombol “Hubungi pengurus klub” di halaman orang tua. Kosongkan kalau tidak mau ditampilkan.">
          <input type="tel" value={f.phoneWa} onChange={(e) => set("phoneWa", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Warna klub">
          <span className="flex items-center gap-3">
            <input
              type="color"
              value={f.primaryColor}
              onChange={(e) => set("primaryColor", e.target.value)}
              className="h-11 w-16 cursor-pointer rounded-lg border border-line bg-card"
            />
            <span className="text-sm text-muted">Pilih warna gelap supaya teks putih tetap terbaca.</span>
          </span>
        </Field>
      </div>
      <Button type="submit" loading={pending}>
        Simpan profil
      </Button>
    </form>
  );
}

export function AgeGroupForm() {
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [year, setYear] = useState("");

  return (
    <form
      className="mt-3 grid gap-3 border-t border-line pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await addAgeGroup({ name, code, birthYear: year });
          if (r?.error) return void toast.error(r.error);
          toast.success("Kelompok umur ditambahkan");
          setName("");
          setCode("");
          setYear("");
        });
      }}
    >
      <Field label="Nama">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="KU 2014" className={inputClass} />
      </Field>
      <Field label="Kode">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="KU-12" className={inputClass} />
      </Field>
      <Field label="Tahun lahir">
        <input inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2014" className={inputClass} />
      </Field>
      <Button type="submit" variant="outline" loading={pending} className="self-end">
        <Plus size={18} aria-hidden /> Tambah KU
      </Button>
    </form>
  );
}

export function AccessCodeForm() {
  const [code, setCode] = useState("");
  const [show, setShow] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <section className="mt-4 rounded-2xl border border-line bg-card p-5 shadow-sm">
      <h3 className="text-xs font-extrabold tracking-wider uppercase">Kode akses pelatih</h3>
      <p className="mt-1 text-sm text-muted">Ganti kode kalau HP pelatih hilang atau ada pelatih yang keluar. Semua HP lain otomatis keluar.</p>
      <form
        className="mt-3 grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim().length < 4) return setError("Kode akses minimal 4 karakter");
          setError("");
          setConfirm(true);
        }}
      >
        <Field label="Kode akses baru" error={error}>
          <span className="relative block">
            <input
              type={show ? "text" : "password"}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="new-password"
              className={inputClass + " pr-12"}
              aria-invalid={!!error}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted"
              aria-label={show ? "Sembunyikan kode" : "Tampilkan kode"}
            >
              {show ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </span>
        </Field>
        <Button type="submit" variant="outline" className="self-end">
          <KeyRound size={18} aria-hidden /> Ganti kode akses
        </Button>
      </form>
      <ConfirmDialog
        open={confirm}
        title="Ganti kode akses?"
        message="Semua HP pelatih lain akan keluar dan harus masuk lagi dengan kode baru. HP ini tetap masuk."
        confirmLabel="Ganti kode"
        loading={pending}
        onClose={() => setConfirm(false)}
        onConfirm={() =>
          start(async () => {
            const r = await changeAccessCode({ code });
            setConfirm(false);
            if (r?.error) {
              setError(r.error);
              return void toast.error(r.error);
            }
            setCode("");
            toast.success("Kode akses diganti. Bagikan kode baru ke pelatih lain.");
          })
        }
      />
    </section>
  );
}

export function LogoutButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      className="mt-4 text-alpa"
      loading={pending}
      onClick={() =>
        start(async () => {
          // Salinan halaman offline ikut dibuang supaya HP pinjaman tidak menyimpan data anak.
          if ("caches" in window) for (const k of await caches.keys()) await caches.delete(k);
          await signOut();
        })
      }
    >
      <LogOut size={18} aria-hidden /> Keluar dari HP ini
    </Button>
  );
}
