"use client";

import { Minus, Play, RotateCcw } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, inputClass } from "@/components/ui/Field";
import { cn } from "@/lib/utils";
import { openSession, setSessionCancelled } from "../actions";

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

/** Tandai libur (dengan alasan untuk ortu) / aktifkan kembali — dipakai di lembar presensi dan halaman jadwal. */
export function CancelSessionButton({
  sessionId,
  cancelled,
  subtle,
  className,
}: {
  sessionId: string;
  cancelled: boolean;
  /** Untuk daftar panjang: tombol netral, merah hanya saat disentuh. */
  subtle?: boolean;
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const run = (cancel: boolean) =>
    start(async () => {
      await setSessionCancelled(sessionId, cancel, reason);
      toast.success(cancel ? "Sesi ditandai libur" : "Sesi diaktifkan kembali");
      setOpen(false);
      setReason("");
    });

  if (cancelled) {
    return (
      <Button type="button" variant="outline" size="md" loading={pending} onClick={() => run(false)} className={className}>
        {!pending && <RotateCcw size={18} aria-hidden />} Aktifkan kembali
      </Button>
    );
  }
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="md"
        onClick={() => setOpen(true)}
        className={cn(
          subtle ? "text-muted hover:border-alpa/30 hover:bg-alpa/10 hover:text-alpa" : "border-alpa/30 bg-alpa/10 text-alpa hover:bg-alpa/15",
          className
        )}
      >
        <Minus size={18} aria-hidden /> Tandai libur
      </Button>
      <ConfirmDialog
        open={open}
        title="Liburkan sesi ini?"
        message="Ortu melihat tanda Libur beserta alasannya dan tidak perlu mengirim izin."
        confirmLabel="Tandai libur"
        danger
        loading={pending}
        onConfirm={() => run(true)}
        onClose={() => setOpen(false)}
      >
        <Field label="Alasan (dibaca ortu)">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
            placeholder="mis. Lapangan dipakai turnamen"
            className={inputClass}
          />
        </Field>
      </ConfirmDialog>
    </>
  );
}
