"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Tab = { id: string; label: string; icon: React.ReactNode; content: React.ReactNode };

/** Tab menyatu dengan kotak isi; tab aktif tersimpan di #hash supaya bisa dibagikan/dibuka langsung. */
export function ParentTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]!.id);

  useEffect(() => {
    const fromHash = window.location.hash.slice(1);
    if (tabs.some((t) => t.id === fromHash)) setActive(fromHash);
  }, [tabs]);

  function pick(id: string) {
    setActive(id);
    history.replaceState(null, "", `#${id}`);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
      <div role="tablist" aria-label="Isi halaman" className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={on}
              aria-controls={`panel-${t.id}`}
              onClick={() => pick(t.id)}
              className={cn(
                "flex min-h-16 flex-col items-center justify-center gap-1 border-b border-line px-1 text-xs font-bold transition-colors [&:not(:first-child)]:border-l",
                on
                  ? "border-b-transparent bg-card text-primary shadow-[inset_0_3px_0_var(--color-primary)]"
                  : "bg-subtle text-muted hover:text-ink"
              )}
            >
              {t.icon}
              <span className="leading-tight">{t.label}</span>
            </button>
          );
        })}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} hidden={t.id !== active} className="p-5">
          {t.content}
        </div>
      ))}
    </div>
  );
}
