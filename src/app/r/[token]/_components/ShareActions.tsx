"use client";

import { Printer, Send } from "lucide-react";
import { waLink } from "@/lib/utils";

export function ShareActions({ url, text }: { url: string; text: string }) {
  return (
    <div className="no-print mt-4 grid grid-cols-2 gap-2">
      <a
        href={waLink(`${text}:\n${url}`)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-bold text-white"
      >
        <Send size={20} aria-hidden /> Bagikan ke WA
      </a>
      <button
        onClick={() => window.print()}
        className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border border-line bg-card px-4 font-bold"
      >
        <Printer size={20} aria-hidden /> Simpan PDF
      </button>
    </div>
  );
}
