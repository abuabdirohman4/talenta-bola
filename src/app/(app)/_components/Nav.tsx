"use client";

import { ArrowLeft, CalendarDays, Check, ChevronDown, ClipboardCheck, House, Moon, NotebookPen, PanelLeftClose, PanelLeftOpen, Settings, Users } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useTransition } from "react";
import { ThemeToggle, toggleTheme } from "@/components/ThemeToggle";
import { Spinner } from "@/components/ui/Spinner";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { setActiveKu } from "./ku-actions";
import { NotifMenu, type NotifItem } from "./NotifBell";
import { StartTodayButton } from "../presensi/_components/SessionControls";

export type NavGroup = { id: string; name: string; code: string; birthYear: number | null; players: number; coach: string | null };

const NAV = [
  { href: "/", label: "Dashboard", short: "Beranda", icon: House, section: "Menu Utama" },
  { href: "/presensi", label: "Presensi Lapangan", short: "Presensi", icon: ClipboardCheck, section: "Menu Utama" },
  { href: "/pemain", label: "Data Pemain", short: "Pemain", icon: Users, section: "Menu Utama" },
  { href: "/rapor", label: "Rapor & Evaluasi", short: "Rapor", icon: NotebookPen, section: "Menu Utama" },
  // Tidak masuk bottom-nav HP (tetap 5 item); di HP dibuka dari kalender Presensi & Pengaturan.
  { href: "/jadwal", label: "Jadwal rutin", short: "Jadwal", icon: CalendarDays, section: "Klub", desktopOnly: true },
  { href: "/pengaturan", label: "Pengaturan Klub", short: "Pengaturan", icon: Settings, section: "Klub" },
] as const;

/** Judul top bar per rute: [remah, judul]. */
const TITLES: [RegExp, string, string][] = [
  [/^\/$/, "Dashboard Pelatih", "Ringkasan Latihan & Pemain"],
  [/^\/jadwal/, "Pengaturan Latihan", "Jadwal Rutin Latihan"],
  [/^\/presensi\/[^/]+$/, "Presensi Lapangan", "Sesi Latihan"],
  [/^\/presensi/, "Presensi Lapangan", "Jadwal & Presensi Latihan"],
  [/^\/pemain\/baru/, "Data Pemain", "Tambah Pemain"],
  [/^\/pemain\/impor/, "Data Pemain", "Impor dari Grup WhatsApp"],
  [/^\/pemain\/[^/]+$/, "Data Pemain", "Profil Pemain"],
  [/^\/pemain/, "Tim & Pemain", "Data Pemain"],
  [/^\/rapor\/[^/]+\/[^/]+$/, "Evaluasi & Rapor Pelatih", "Penilaian Pemain"],
  [/^\/rapor\/[^/]+$/, "Evaluasi & Rapor Pelatih", "Periode Rapor"],
  [/^\/rapor/, "Evaluasi & Rapor Pelatih", "Rapor & Evaluasi"],
  [/^\/notifikasi/, "Klub", "Notifikasi"],
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
      className={cn("grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-subtle text-ink hover:bg-ground relative after:absolute after:-inset-1 after:content-['']", className)}
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

function useActiveGroup(groups: NavGroup[], savedKu?: string) {
  const ku = useSearchParams().get("ku") ?? savedKu;
  return groups.find((g) => g.id === ku) ?? groups[0];
}

/** Pilih KU aktif (disimpan di cookie, berlaku di semua halaman); satu KU saja = teks biasa. */
function KuSelect({ groups, active, className }: { groups: NavGroup[]; active: NavGroup; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const label = (g: NavGroup) => `${g.code}${g.birthYear ? ` (${g.birthYear})` : ""}`;

  // Tutup saat klik di luar atau tekan Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (groups.length < 2) return <span className={className}>{label(active)}</span>;
  const pick = (id: string) => {
    setOpen(false);
    if (id === active.id) return;
    start(async () => {
      await setActiveKu(id);
      // Buang ?ku= lama supaya halaman ikut KU yang baru dipilih.
      router.replace(pathname);
      router.refresh();
    });
  };
  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Kelompok umur: ${label(active)}. Ganti`}
        onClick={() => setOpen((o) => !o)}
        className={cn("inline-flex max-w-full items-center gap-1 rounded-md outline-offset-2", pending && "opacity-60", className)}
      >
        <span className="truncate">{label(active)}</span>
        {pending ? <Spinner size={12} /> : <ChevronDown size={14} className={cn("shrink-0 transition-transform", open && "rotate-180")} aria-hidden />}
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Pilih kelompok umur"
          className="absolute top-full left-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-card p-1 text-ink shadow-xl"
        >
          {groups.map((g) => {
            const on = g.id === active.id;
            return (
              <li key={g.id} role="option" aria-selected={on}>
                <button
                  type="button"
                  onClick={() => pick(g.id)}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm hover:bg-ground",
                    on && "bg-primary-soft"
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className={cn("block font-bold", on && "text-primary")}>{label(g)}</span>
                    <span className="block text-xs font-medium text-muted">{g.players} anak</span>
                  </span>
                  {on && <Check size={16} className="shrink-0 text-primary" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Ikon diganti spinner selama halaman tujuan dimuat — tanda < 100 ms setelah tap. */
function NavIcon({ icon: Icon, size }: { icon: typeof House; size: number }) {
  const { pending } = useLinkStatus();
  return pending ? <Spinner size={size - 2} /> : <Icon size={size} aria-hidden />;
}

export function KuPanel({ groups, savedKu }: { groups: NavGroup[]; savedKu?: string }) {
  const g = useActiveGroup(groups, savedKu);
  if (!g) return null;
  return (
    <>
    <span
      className="sb-show mx-auto mt-3 rounded-lg border border-line bg-subtle px-2 py-1 text-[11px] font-extrabold text-primary"
      title={`Kelompok usia aktif: ${g.code}`}
    >
      {g.code}
    </span>
    <div className="sb-hide mx-3 mt-3 flex items-center justify-between gap-2 rounded-xl border border-line bg-subtle p-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="size-2 shrink-0 animate-pulse rounded-full bg-primary" />
        <div className="min-w-0">
          <span className="eyebrow block text-[10px]">Kelompok usia aktif</span>
          <KuSelect groups={groups} active={g} className="min-h-8 text-[13px] leading-snug font-extrabold" />
        </div>
      </div>
      <span className="shrink-0 rounded-md border border-line bg-card px-1.5 py-0.5 text-[11px] font-bold text-muted">
        {g.players} Anak
      </span>
    </div>
    </>
  );
}

export function SideNav({ groups, savedKu }: { groups: NavGroup[]; savedKu?: string }) {
  const isActive = useActive();
  const playerCount = useActiveGroup(groups, savedKu)?.players ?? 0;
  let section = "";
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {NAV.map((n) => {
        const header = n.section !== section ? (section = n.section) : null;
        const active = isActive(n.href);
        return (
          <div key={n.href}>
            {header && <p className="eyebrow sb-hide px-3 pt-3 pb-1 text-[10px]">{header}</p>}
            <Link
              href={n.href}
              title={n.label}
              aria-label={n.label}
              className={cn(
                "sb-center flex min-h-11 items-center gap-3 rounded-xl border border-transparent px-3 text-[13px] font-semibold text-muted hover:bg-ground hover:text-ink",
                active && "border-primary/30 bg-primary-soft font-bold text-primary shadow-sm hover:bg-primary-soft hover:text-primary"
              )}
            >
              <NavIcon icon={n.icon} size={17} />
              <span className="sb-hide flex-1">{n.label}</span>
              {n.href === "/pemain" && (
                <span className={cn("sb-hide text-[10px] font-semibold", active ? "text-primary" : "text-muted")}>
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
      title="Mode Tampilan"
      aria-label="Ganti mode terang/gelap"
      className="sb-center flex min-h-11 w-full items-center justify-between rounded-xl border border-line px-3 text-xs font-semibold hover:bg-ground"
    >
      <span className="sb-hide">Mode Tampilan</span>
      <span className="sb-hide text-[10px] font-bold text-primary">Terang / Gelap</span>
      <Moon size={17} className="sb-show" aria-hidden />
    </button>
  );
}

/** Ciut/buka sidebar desktop: atribut html[data-sb] (CSS di globals.css), pilihan disimpan di localStorage. */
/** Tombol ciut/buka sidebar desktop; tinggal di kepala sidebar. */
export function SidebarToggle() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => setCollapsed(document.documentElement.dataset.sb === "collapsed"), []);
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const label = collapsed ? "Buka sidebar" : "Ciutkan sidebar";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-expanded={!collapsed}
      onClick={() => {
        const next = !collapsed;
        if (next) document.documentElement.dataset.sb = "collapsed";
        else delete document.documentElement.dataset.sb;
        try {
          localStorage.setItem("tb-sidebar-collapsed", next ? "1" : "0");
        } catch {}
        setCollapsed(next);
      }}
      className="sb-toggle grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-subtle text-ink hover:bg-ground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Icon size={18} aria-hidden />
    </button>
  );
}

export function TopBar({ ssbName, groups, unread, savedKu, notifs }: { ssbName: string; groups: NavGroup[]; unread: number; savedKu?: string; notifs: NotifItem[] }) {
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
        <NotifMenu unread={unread} items={notifs} />
        <ThemeToggle />
        {!path.startsWith("/presensi/") && (
          <Suspense>
            <TopBarAction groups={groups} savedKu={savedKu} />
          </Suspense>
        )}
      </div>
    </div>
  );
}

/** Satu-satunya bagian top bar yang membaca ?ku — dibungkus Suspense sendiri supaya judul & tombol kembali hydrate bersama layout. */
function TopBarAction({ groups, savedKu }: { groups: NavGroup[]; savedKu?: string }) {
  const g = useActiveGroup(groups, savedKu);
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

export function MobileKuLine({ groups, savedKu }: { groups: NavGroup[]; savedKu?: string }) {
  const g = useActiveGroup(groups, savedKu);
  const coach = g?.coach;
  return (
    <span className="flex min-w-0 items-center gap-1 text-[11px] font-bold text-primary">
      {g && <KuSelect groups={groups} active={g} className="min-h-6 font-bold" />}
      {coach && <span className="truncate">· {coach}</span>}
    </span>
  );
}

/** Pelatih KU yang sedang dipilih (atau pelatih kepala) di kaki sidebar. */
export function CoachChip({ groups, savedKu }: { groups: NavGroup[]; savedKu?: string }) {
  const coach = useActiveGroup(groups, savedKu)?.coach ?? "Pelatih";
  return (
    <div className="sb-center flex items-center gap-2.5 px-2 py-1.5" title={coach}>
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-linear-to-br from-primary to-primary-2 text-xs font-bold text-white shadow-sm">
        {initials(coach)}
      </span>
      <div className="sb-hide min-w-0 leading-tight">
        <p className="truncate text-xs font-bold">{coach}</p>
        <p className="truncate text-[10px] text-muted">Pelatih KU</p>
      </div>
    </div>
  );
}
