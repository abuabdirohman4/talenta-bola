"use client";

import { KeyRound, LogOut, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, inputClass } from "@/components/ui/Field";
import { createSsb, deleteSsb, resetSsbCode } from "../actions";
import { signOutAdmin } from "../masuk/actions";

const EMPTY = { name: "", slug: "", kuCode: "", kuName: "", birthYear: "", primaryColor: "#059669", code: "" };
const slugify = (s: string) => s.toLowerCase().replace(/^ssb\s+/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function CreateSsbForm() {
  const [f, setF] = useState(EMPTY);
  const [slugEdited, setSlugEdited] = useState(false);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof EMPTY, v: string) => setF((p) => ({ ...p, [k]: v }));

  return (
    <form
      className="space-y-4 rounded-2xl border border-line bg-card p-5 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await createSsb(f);
          if (r?.error) return void toast.error(r.error);
          toast.success(`${f.name} ditambahkan. Kirim kode akses ke pengurus klub.`);
          setF(EMPTY);
          setSlugEdited(false);
        });
      }}
    >
      <h2 className="text-xs font-extrabold tracking-wider uppercase">Tambah SSB</h2>
      <Field label="Nama SSB" required>
        <input
          value={f.name}
          onChange={(e) => {
            set("name", e.target.value);
            if (!slugEdited) set("slug", slugify(e.target.value));
          }}
          placeholder="SSB Garuda Muda"
          className={inputClass}
          required
        />
      </Field>
      <Field label="Slug" required hint="Huruf kecil dan tanda minus, unik per klub">
        <input
          value={f.slug}
          onChange={(e) => {
            setSlugEdited(true);
            set("slug", e.target.value);
          }}
          className={inputClass}
          required
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Kode KU pertama" required>
          <input value={f.kuCode} onChange={(e) => set("kuCode", e.target.value)} placeholder="KU-10" className={inputClass} required />
        </Field>
        <Field label="Nama KU" required>
          <input value={f.kuName} onChange={(e) => set("kuName", e.target.value)} placeholder="KU 2016" className={inputClass} required />
        </Field>
        <Field label="Tahun lahir">
          <input inputMode="numeric" value={f.birthYear} onChange={(e) => set("birthYear", e.target.value)} placeholder="2016" className={inputClass} />
        </Field>
        <Field label="Warna klub">
          <input
            type="color"
            value={f.primaryColor}
            onChange={(e) => set("primaryColor", e.target.value)}
            className="h-11 w-full cursor-pointer rounded-lg border border-line bg-card"
          />
        </Field>
      </div>
      <Field label="Kode akses awal" required hint="Minimal 4 karakter; pengurus bisa menggantinya di Pengaturan">
        <input value={f.code} onChange={(e) => set("code", e.target.value)} autoComplete="off" className={inputClass} required minLength={4} />
      </Field>
      <Button type="submit" loading={pending} className="w-full">
        <Plus size={18} aria-hidden /> Tambah SSB
      </Button>
    </form>
  );
}

export function SsbActions({ ssb }: { ssb: { id: string; name: string } }) {
  const [dialog, setDialog] = useState<"code" | "delete" | null>(null);
  const [code, setCode] = useState("");
  const [pending, start] = useTransition();
  const close = () => {
    setDialog(null);
    setCode("");
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => setDialog("code")} aria-label={`Reset kode akses ${ssb.name}`}>
        <KeyRound size={18} aria-hidden /> Reset kode
      </Button>
      <Button variant="ghost" className="text-alpa" onClick={() => setDialog("delete")} aria-label={`Hapus ${ssb.name}`}>
        <Trash2 size={18} aria-hidden />
      </Button>
      <ConfirmDialog
        open={dialog === "code"}
        title={`Reset kode ${ssb.name}?`}
        message="Semua HP pelatih klub ini langsung keluar dan harus masuk dengan kode baru."
        confirmLabel="Reset kode"
        loading={pending}
        onClose={close}
        onConfirm={() =>
          start(async () => {
            const r = await resetSsbCode({ ssbId: ssb.id, code });
            if (r?.error) return void toast.error(r.error);
            toast.success(`Kode ${ssb.name} diganti. Kirim kode baru ke pengurus klub.`);
            close();
          })
        }
      >
        <Field label="Kode akses baru">
          <input value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" className={inputClass} />
        </Field>
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "delete"}
        title={`Hapus ${ssb.name}?`}
        message="Pelatih tidak bisa masuk lagi, link orang tua dan link rapor klub ini berhenti berlaku. Data tetap tersimpan (bisa dipulihkan dari database)."
        confirmLabel="Hapus SSB"
        danger
        loading={pending}
        onClose={close}
        onConfirm={() =>
          start(async () => {
            const r = await deleteSsb({ ssbId: ssb.id });
            if (r?.error) return void toast.error(r.error);
            toast.success(`${ssb.name} dihapus`);
            close();
          })
        }
      />
    </div>
  );
}

export function AdminLogout() {
  const [pending, start] = useTransition();
  return (
    <Button variant="ghost" className="text-alpa" loading={pending} onClick={() => start(() => signOutAdmin())}>
      <LogOut size={18} aria-hidden /> Keluar
    </Button>
  );
}
