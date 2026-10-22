"use client";

import { ArrowLeft, CalendarDays, ClipboardCheck, House, NotebookPen, Settings, Users } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ThemeToggle, toggleTheme } from "@/components/ThemeToggle";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import { StartTodayButton } from "../presensi/_components/SessionControls";

export type NavGroup = { id: string; name: string; code: string; birthYear: number | null; players: number };

const NAV = [
  { href: "/", label: "Dashboard", short: "Beranda", icon: House, section: "Menu Utama" },
  { href: "/presensi", label: "Presensi Lapangan", short: "Presensi", icon: ClipboardCheck, section: "Menu Utama" },
  { href: "/rapor", label: "Rapor & Evaluasi", short: "Rapor", icon: NotebookPen, section: "Menu Utama" },
  { href: "/pemain", label: "Data Pemain", short: "Pemain", icon: Users, section: "Tim & Pemain" },
  // Tidak masuk bottom-nav HP (tetap 5 item); di HP dibuka dari tombol Atur Jadwal di beranda & presensi.
  { href: "/jadwal", label: "Jadwal & Agenda", short: "Jadwal", icon: CalendarDays, section: "Tim & Pemain", desktopOnly: true },
  { href: "/pengaturan", label: "Pengaturan Klub", short: "Pengaturan", icon: Settings, section: "Klub" },
] as const;

/** Judul top bar per rute: [remah, judul]. */
const TITLES: [RegExp, string, string][] = [
  [/^\/$/, "Dashboard Pelatih", "Ringkasan Latihan & Pemain"],
  [/^\/jadwal/, "Kalender Latihan", "Jadwal & Agenda Latihan"],
  [/^\/presensi\/[^/]+$/, "Presensi Lapangan", "Sesi Latihan"],
  [/^\/presensi/, "Presensi Lapangan", "Jadwal & Presensi Latihan"],
  [/^\/pemain\/baru/, "Data Pemain", "Tambah Pemain"],
  [/^\/pemain\/impor/, "Data Pemain", "Impor dari Grup WhatsApp"],
  [/^\/pemain\/[^/]+$/, "Data Pemain", "Profil Pemain"],
  [/^\/pemain/, "Tim & Pemain", "Data Pemain"],
  [/^\/rapor\/[^/]+\/[^/]+$/, "Evaluasi & Rapor Pelatih", "Penilaian Pemain"],
  [/^\/rapor\/[^/]+$/, "Evaluasi & Rapor Pelatih", "Periode Rapor"],
  [/^\/rapor/, "Evaluasi & Rapor Pelatih", "Rapor & Evaluasi"],
  [/^\/pengaturan/, "Klub", "Pengaturan Klub"],
];

function useActive() {
  const path = usePathname();
  return (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
}

/** Halaman bertingkat (/pemain/x, /rapor/x/y) → induknya; halaman menu utama → null. */
function useParent() {
  const seg = usePathname().split("/").filter(Boolean);
  return seg.length > 1 ? "/" + seg.slice(0, -1).join("/") : null;
}

function useTitle() {
  const path = usePathname();
  const [, crumb, title] = TITLES.find(([re]) => re.test(path)) ?? [null, "", ""];
  return { crumb, title };
}

function BackButton({ href, className }: { href: string; className?: string }) {
  return (
    <Link
      href={href}
      aria-label="Kembali"
      className={cn("grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-subtle text-ink hover:bg-ground", className)}
    >
      <NavIcon icon={ArrowLeft} size={18} />
    </Link>
  );
}

/** Header HP: halaman bertingkat dapat tombol kembali + judul; halaman menu utama menampilkan klub (children). */
export function MobileHeaderLead({ children }: { children: React.ReactNode }) {
  const parent = useParent();
  const { title } = useTitle();
  if (!parent) return <>{children}</>;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <BackButton href={parent} className="size-9" />
      <p className="truncate text-sm font-black tracking-tight">{title}</p>
    </div>
  );
}

function useActiveGroup(groups: NavGroup[]) {
  const ku = useSearchParams().get("ku");
  return groups.find((g) => g.id === ku) ?? groups[0];
}

/** Ikon diganti spinner selama halaman tujuan dimuat — tanda < 100 ms setelah tap. */
function NavIcon({ icon: Icon, size }: { icon: typeof House; size: number }) {
  const { pending } = useLinkStatus();
  return pending ? <Spinner size={size - 2} /> : <Icon size={size} aria-hidden />;
}

export function KuPanel({ groups }: { groups: NavGroup[] }) {
  const g = useActiveGroup(groups);
  if (!g) return null;
  return (
    <div className="mx-3 mt-3 flex items-center justify-between gap-2 rounded-xl border border-line bg-subtle p-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="size-2 shrink-0 animate-pulse rounded-full bg-primary" />
        <div className="min-w-0">
          <span className="eyebrow block text-[10px]">Kelompok usia aktif</span>
          <span className="block text-[13px] leading-snug font-extrabold">
            {g.code}
            {g.birthYear ? ` (Kelahiran ${g.birthYear})` : ` · ${g.name}`}
          </span>
        </div>
      </div>
      <span className="shrink-0 rounded-md border border-line bg-card px-1.5 py-0.5 text-[11px] font-bold text-muted">
        {g.players} Anak
      </span>
    </div>
  );
}

export function SideNav({ playerCount }: { playerCount: number }) {
  const isActive = useActive();
  let section = "";
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {NAV.map((n) => {
        const header = n.section !== section ? (section = n.section) : null;
        const active = isActive(n.href);
        return (
          <div key={n.href}>
            {header && <p className="eyebrow px-3 pt-3 pb-1 text-[10px]">{header}</p>}
            <Link
              href={n.href}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-xl border border-transparent px-3 text-[13px] font-semibold text-muted hover:bg-ground hover:text-ink",
                active && "border-primary/30 bg-primary-soft font-bold text-primary shadow-sm hover:bg-primary-soft hover:text-primary"
              )}
            >
              <NavIcon icon={n.icon} size={17} />
              <span className="flex-1">{n.label}</span>
              {n.href === "/pemain" && (
                <span className={cn("text-[10px] font-semibold", active ? "text-primary" : "text-muted")}>
                  {playerCount} anak
                </span>
              )}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}

export function ThemeRow() {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex min-h-10 w-full items-center justify-between rounded-xl border border-line px-3 text-xs font-semibold hover:bg-ground"
    >
      <span>Mode Tampilan</span>
      <span className="text-[10px] font-bold text-primary">Terang / Gelap</span>
    </button>
  );
}

export function TopBar({ ssbName, groups }: { ssbName: string; groups: NavGroup[] }) {
  const path = usePathname();
  const parent = useParent();
  const { crumb, title } = useTitle();
  return (
    <div className="no-print sticky top-0 z-20 hidden items-center justify-between gap-4 border-b border-line bg-card px-8 py-4 shadow-sm md:flex">
      <div className="flex min-w-0 items-center gap-3">
        {parent && <BackButton href={parent} />}
        <div className="min-w-0">
        <p className="flex items-center gap-2 truncate text-xs font-medium text-muted">
          <span>{ssbName}</span>
          <span>/</span>
          <span className="font-bold text-ink">{crumb}</span>
        </p>
        <h1 className="mt-0.5 truncate text-base font-black tracking-tight">{title}</h1>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <ThemeToggle />
        {!path.startsWith("/presensi/") && (
          <Suspense>
            <TopBarAction groups={groups} />
          </Suspense>
        )}
      </div>
    </div>
  );
}

/** Satu-satunya bagian top bar yang membaca ?ku — dibungkus Suspense sendiri supaya judul & tombol kembali hydrate bersama layout. */
function TopBarAction({ groups }: { groups: NavGroup[] }) {
  const g = useActiveGroup(groups);
  return g ? <StartTodayButton ageGroupId={g.id} size="md" label="Catat Presensi Hari Ini" className="mt-0 w-auto" /> : null;
}

export function BottomNav() {
  const isActive = useActive();
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-lg backdrop-blur-md md:hidden">
      {NAV.filter((n) => !("desktopOnly" in n)).map((n) => (
        <Link
          key={n.href}
          href={n.href}
          className={cn(
            "flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-bold text-muted",
            isActive(n.href) && "font-extrabold text-primary"
          )}
        >
          <NavIcon icon={n.icon} size={22} />
          {n.short}
        </Link>
      ))}
    </nav>
  );
}

export function MobileKuLine({ groups, coach }: { groups: NavGroup[]; coach: string | null }) {
  const g = useActiveGroup(groups);
  return (
    <span className="block truncate text-[11px] font-bold text-primary">
      {g ? `${g.code}${g.birthYear ? ` (${g.birthYear})` : ""}` : ""}
      {coach ? ` · ${coach}` : ""}
    </span>
  );
}
