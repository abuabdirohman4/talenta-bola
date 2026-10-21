"use client";

import { ClipboardCheck, House, NotebookPen, Settings, Users } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Beranda", icon: House },
  { href: "/presensi", label: "Presensi", icon: ClipboardCheck },
  { href: "/pemain", label: "Pemain", icon: Users },
  { href: "/rapor", label: "Rapor", icon: NotebookPen },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings },
];

function useActive() {
  const path = usePathname();
  return (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
}

/** Ikon diganti spinner selama halaman tujuan dimuat — tanda < 100 ms setelah tap. */
function NavIcon({ icon: Icon, size }: { icon: typeof House; size: number }) {
  const { pending } = useLinkStatus();
  return pending ? <Spinner size={size - 2} /> : <Icon size={size} aria-hidden />;
}

export function SideNav() {
  const isActive = useActive();
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          className={cn(
            "flex min-h-11 items-center gap-3 rounded-xl px-3 font-semibold text-muted hover:bg-ground",
            isActive(n.href) && "bg-primary-soft text-primary"
          )}
        >
          <NavIcon icon={n.icon} size={20} />
          {n.label}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav() {
  const isActive = useActive();
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          className={cn(
            "flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold text-muted",
            isActive(n.href) && "text-primary"
          )}
        >
          <NavIcon icon={n.icon} size={22} />
          {n.label}
        </Link>
      ))}
    </nav>
  );
}
