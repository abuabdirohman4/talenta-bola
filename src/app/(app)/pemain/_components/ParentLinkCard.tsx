"use client";

import { Copy, Link2, RefreshCw, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { waLink } from "@/lib/utils";
import { regenerateParentToken } from "../actions";

type Props = {
  playerId: string;
  playerName: string;
  ssbName: string;
  parentPhoneWa: string | null;
  baseUrl: string;
  token: string;
};

/** Link ortu tanpa login: dibagikan sekali lewat WA, bisa dibuat ulang kalau tersebar. */
export function ParentLinkCard({ playerId, playerName, ssbName, parentPhoneWa, baseUrl, token: initial }: Props) {
  const [token, setToken] = useState(initial);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const url = `${baseUrl}/ortu/${token}`;
  const message =
    `Assalamu'alaikum Ayah/Bunda ${playerName}. Ini link khusus dari ${ssbName} untuk ${playerName}: ` +
    `lihat kehadiran, ajukan izin/sakit, dan baca rapor perkembangan.\n\n${url}\n\nMohon link ini tidak dibagikan ke grup.`;

  return (
    <section className="mb-5 max-w-3xl rounded-2xl border border-primary/20 bg-primary-soft p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-xs font-extrabold tracking-wider text-primary uppercase">
        <Link2 size={18} aria-hidden /> Link untuk orang tua
      </h3>
      <p className="mt-1 text-sm text-muted">
        Ortu membuka link ini untuk izin/sakit dan melihat rapor — tanpa perlu daftar akun.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={waLink(message, parentPhoneWa)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 font-bold text-white shadow-sm hover:bg-primary-dark"
        >
          <Send size={18} aria-hidden /> {parentPhoneWa ? "Kirim ke WA ortu" : "Kirim lewat WA"}
        </a>
        <Button
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              toast.success("Link tersalin");
            } catch {
              toast.error("Gagal menyalin");
            }
          }}
        >
          <Copy size={18} aria-hidden /> Salin link
        </Button>
        <Button variant="ghost" onClick={() => setConfirm(true)} loading={pending}>
          <RefreshCw size={18} aria-hidden /> Buat link baru
        </Button>
      </div>
      <ConfirmDialog
        open={confirm}
        title="Buat link baru?"
        message="Link lama langsung tidak bisa dipakai. Pakai ini kalau link sempat tersebar ke orang lain."
        confirmLabel="Buat link baru"
        loading={pending}
        onClose={() => setConfirm(false)}
        onConfirm={() =>
          start(async () => {
            const r = await regenerateParentToken(playerId);
            setConfirm(false);
            if (r.error || !r.token) return void toast.error(r.error ?? "Gagal");
            setToken(r.token);
            toast.success("Link baru dibuat. Kirim ulang ke ortu.");
          })
        }
      />
    </section>
  );
}
