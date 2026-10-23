import Link from "next/link";
import { cn } from "@/lib/utils";

/** Pilihan kelompok umur; tidak tampil kalau SSB baru punya satu KU. */
export function KuSwitcher({
  groups,
  activeId,
  basePath,
}: {
  groups: { id: string; name: string }[];
  activeId: string | undefined;
  basePath: string;
}) {
  if (groups.length < 2) return null;
  return (
    <nav className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0" aria-label="Kelompok umur">
      {groups.map((g) => (
        <Link
          key={g.id}
          href={`${basePath}?ku=${g.id}`}
          className={cn(
            "min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-semibold",
            g.id === activeId ? "border-primary bg-primary text-white" : "border-line bg-card text-ink"
          )}
        >
          {g.name}
        </Link>
      ))}
    </nav>
  );
}
