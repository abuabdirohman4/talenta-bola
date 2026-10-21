"use client";

import { Hand, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { cn } from "@/lib/utils";
import { submitPermission } from "../actions";

type Session = { id: string; label: string; cancelled: boolean; sent: string | null };

export function IzinForm({ token, sessions }: { token: string; sessions: Session[] }) {
  const open = sessions.filter((s) => !s.cancelled);
  const [sessionId, setSessionId] = useState(open[0]?.id ?? "");
  const [type, setType] = useState<"IZIN" | "SAKIT">("IZIN");
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  return (
    <form
      className="mt-3 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await submitPermission({ token, sessionId, type, reason });
          if (r.error) return void toast.error(r.error);
          toast.success("Izin terkirim. Pelatih melihatnya di daftar presensi.");
          setReason("");
        });
      }}
    >
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Untuk latihan</legend>
        <div className="space-y-2">
          {sessions.map((s) => (
            <label
              key={s.id}
              className={cn(
                "flex min-h-12 items-start gap-3 rounded-xl border px-3 py-2.5",
                s.cancelled ? "border-line opacity-60" : sessionId === s.id ? "border-primary bg-primary-soft" : "border-line",
                !s.cancelled && "cursor-pointer"
              )}
            >
              <input
                type="radio"
                name="session"
                value={s.id}
                disabled={s.cancelled}
                checked={sessionId === s.id}
                onChange={() => setSessionId(s.id)}
                className="mt-1 size-5 accent-[var(--color-primary)]"
              />
              <span>
                <span className="font-semibold">{s.label}</span>
                {s.cancelled && <span className="block text-sm text-warn">Libur</span>}
                {s.sent && <span className="block text-sm text-izin">Sudah dikirim — {s.sent}</span>}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Keterangan</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["IZIN", "Izin", Hand, "border-izin bg-izin"],
              ["SAKIT", "Sakit", Plus, "border-sakit bg-sakit"],
            ] as const
          ).map(([value, label, Icon, on]) => (
            <button
              key={value}
              type="button"
              aria-pressed={type === value}
              onClick={() => setType(value)}
              className={cn(
                "flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 text-base font-bold",
                type === value ? `${on} text-white` : "border-line bg-card"
              )}
            >
              <Icon size={20} aria-hidden /> {label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Alasan</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          maxLength={200}
          placeholder={type === "SAKIT" ? "mis. Demam sejak semalam" : "mis. Acara keluarga ke Bandung"}
          className={inputClass}
          required
        />
      </label>

      <Button type="submit" size="lg" className="w-full" loading={pending} disabled={!sessionId}>
        Kirim {type === "SAKIT" ? "keterangan sakit" : "izin"}
      </Button>
    </form>
  );
}
