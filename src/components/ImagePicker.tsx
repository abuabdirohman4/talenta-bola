"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "./Avatar";

/** Potong tengah jadi persegi 320 px JPEG — foto HP 4 MB jadi ±30 KB sebelum dikirim. */
async function toSquareJpeg(file: File, size = 320): Promise<string> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  canvas
    .getContext("2d")!
    .drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  bmp.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function ImagePicker({
  name,
  value,
  onChange,
  label = "Foto",
}: {
  name: string;
  value: string;
  onChange: (dataUrl: string) => void;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name || "?"} photoUrl={value || null} className="size-20 text-xl" />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-card px-4 font-semibold"
        >
          <Camera size={18} aria-hidden /> {busy ? "Memproses…" : value ? `Ganti ${label.toLowerCase()}` : `Pilih ${label.toLowerCase()}`}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold text-alpa"
          >
            <Trash2 size={18} aria-hidden /> Hapus
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          try {
            onChange(await toSquareJpeg(f));
          } catch {
            toast.error("Foto tidak bisa dibaca. Coba foto lain.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
