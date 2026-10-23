"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/** Ganti terang/gelap; pilihan disimpan, tanpa pilihan ikut sistem (skrip di root layout). */
export function toggleTheme() {
  const dark = document.documentElement.classList.toggle("dark");
  try {
    localStorage.setItem("theme", dark ? "dark" : "light");
  } catch {}
}

export function ThemeToggle({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Ganti mode terang/gelap"
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-subtle text-ink hover:bg-ground relative after:absolute after:-inset-1 after:content-['']",
        className
      )}
    >
      <Moon size={18} className="dark:hidden" aria-hidden />
      <Sun size={18} className="hidden text-amber-400 dark:block" aria-hidden />
    </button>
  );
}
