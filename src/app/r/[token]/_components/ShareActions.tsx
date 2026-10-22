"use client";

import { Printer, Send } from "lucide-react";
import { waLink } from "@/lib/utils";

export function ShareActions({ url, text }: { url: string; text: string }) {
  return (
    <div className="no-print grid flex-1 grid-cols-2 gap-2 sm:flex-none">
      <button
        onClick={() => window.print()}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-card px-3 text-sm font-bold whitespace-nowrap sm:px-4 hover:bg-ground"
      >
        <Printer size={18} aria-hidden /> Simpan PDF
      </button>
      <a
        href={waLink(`${text}:\n${url}`)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-bold whitespace-nowrap sm:px-4 text-white hover:bg-primary-dark"
      >
        <Send size={18} aria-hidden /> Bagikan ke WA
      </a>
    </div>
  );
}
