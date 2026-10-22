"use client";

import { ArrowLeft, CalendarDays, Check, CloudOff, Copy, Hand, Minus, Plus, Search, Send, Settings2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, inputClass } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import {
  countStatuses,
  resolveStatus,
  STATUS_LABEL,
  type Mark,
  type Permission,
  type SheetStatus,
  type Status,
} from "@/lib/attendance";
import { formatDateId, formatTimeId } from "@/lib/format";
import { positionLabel } from "@/lib/players";
import { buildRekap } from "@/lib/rekap";
import { cn, waLink } from "@/lib/utils";
import { resolvePermission, setSessionCancelled, updateSessionInfo } from "../../actions";
import { enqueue, readQueue, sendQueue } from "./offline-queue";

type Props = {
  session: {
    id: string;
    date: string;
    startTime: string;
    location: string | null;
    topic: string | null;
    cancelled: boolean;
    groupName: string;
    groupCode: string;
  };
  roster: { id: string; fullName: string; nickname: string | null; jerseyNumber: number | null; position: string | null }[];
  serverMarks: Record<string, Mark>;
  permissions: Record<string, Permission>;
};

const BUTTONS: { status: Status; letter: string; icon: typeof Check }[] = [
  { status: "HADIR", letter: "H", icon: Check },
  { status: "IZIN", letter: "I", icon: Hand },
  { status: "SAKIT", letter: "S", icon: Plus },
  { status: "ALPA", letter: "A", icon: X },
];

// Kelas lengkap ditulis eksplisit supaya ikut dipindai Tailwind.
const TONE: Record<Status, { solid: string; soft: string; text: string }> = {
  HADIR: { solid: "bg-hadir border-hadir text-white", soft: "bg-hadir/15 border-hadir/50 text-hadir", text: "text-hadir" },
  IZIN: { solid: "bg-izin border-izin text-white", soft: "bg-izin/15 border-izin/50 text-izin", text: "text-izin" },
  SAKIT: { solid: "bg-sakit border-sakit text-white", soft: "bg-sakit/15 border-sakit/50 text-sakit", text: "text-sakit" },
  ALPA: { solid: "bg-alpa border-alpa text-white", soft: "bg-alpa/15 border-alpa/50 text-alpa", text: "text-alpa" },
};
const BADGE: Record<Status, string> = {
  HADIR: "bg-hadir/15 text-hadir",
  IZIN: "bg-izin/15 text-izin",
  SAKIT: "bg-sakit/15 text-sakit",
  ALPA: "bg-alpa/15 text-alpa",
};
const PILL: Record<Status, string> = {
  HADIR: "bg-hadir/10 text-hadir border-hadir/30",
  IZIN: "bg-izin/10 text-izin border-izin/30",
  SAKIT: "bg-sakit/10 text-sakit border-sakit/30",
  ALPA: "bg-alpa/10 text-alpa border-alpa/30",
};
const BAR: Record<Status, string> = { HADIR: "bg-hadir", IZIN: "bg-izin", SAKIT: "bg-sakit", ALPA: "bg-alpa" };
const BOX: Record<SheetStatus, string> = {
  HADIR: "border-hadir/30 bg-hadir/10 text-hadir",
  IZIN: "border-izin/30 bg-izin/10 text-izin",
  SAKIT: "border-sakit/30 bg-sakit/10 text-sakit",
  ALPA: "border-alpa/30 bg-alpa/10 text-alpa",
  BELUM: "border-line bg-subtle text-muted",
};
const card = "rounded-2xl border border-line bg-card shadow-sm";

type Sync = "saved" | "saving" | "offline" | "error";
const PAGE_CACHE = "talenta-bola-pages";

export function AttendanceSheet({ session, roster, serverMarks, permissions }: Props) {
  const router = useRouter();
  const [local, setLocal] = useState<Record<string, Mark>>({});
  const [sync, setSync] = useState<Sync>("saved");
  const [queued, setQueued] = useState(0);
  const [filter, setFilter] = useState<"all" | "belum" | "hadir">("all");
  const [query, setQuery] = useState("");
  const [confirmBulk, setConfirmBulk] = useState(false);
  const flushing = useRef(false);

  // Tap yang belum terkirim (mis. HP sempat offline lalu halaman dibuka ulang) tetap ditampilkan.
  useEffect(() => {
    const mine = readQueue().filter((m) => m.sessionId === session.id);
    if (mine.length) {
      setLocal(Object.fromEntries(mine.map((m) => [m.playerId, { status: m.status, updatedAt: m.at }])));
      setQueued(mine.length);
    }
  }, [session.id]);

  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    setSync("saving");
    const { result, left } = await sendQueue();
    flushing.current = false;
    setQueued(left);
    if (result === "ok") setSync(left ? "saving" : "saved");
    else if (result === "offline") setSync("offline");
    else {
      setSync("error");
      if (result === "unauthorized") toast.error("Sesi masuk habis. Tap tetap tersimpan di HP — silakan masuk lagi.");
    }
    if (result === "ok" && left) setTimeout(flush, 300);
  }, []);

  // Kirim ulang saat sinyal kembali + coba berkala selama masih ada antrean.
  useEffect(() => {
    flush();
    const onOnline = () => flush();
    window.addEventListener("online", onOnline);
    const t = setInterval(() => readQueue().length && flush(), 10_000);
    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(t);
    };
  }, [flush]);

  // Simpan salinan halaman ini supaya bisa dibuka ulang di lapangan tanpa sinyal (SW menyajikannya dari cache).
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("caches" in window) || !navigator.onLine) return;
    caches.open(PAGE_CACHE).then((c) => c.add(location.pathname)).catch(() => {});
  }, []);

  // Izin ortu yang masuk saat halaman terbuka ikut muncul ketika pelatih kembali ke aplikasi.
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && !readQueue().length && router.refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  const rows = useMemo(
    () =>
      roster.map((p, i) => {
        const s = serverMarks[p.id];
        const l = local[p.id];
        const mark = l && (!s || l.updatedAt >= s.updatedAt) ? l : s;
        return { ...p, no: i + 1, ...resolveStatus(mark, permissions[p.id]) };
      }),
    [roster, serverMarks, local, permissions]
  );
  const counts = countStatuses(rows.map((r) => r.status));

  function mark(playerIds: string[], status: Status) {
    const at = Date.now();
    for (const playerId of playerIds) enqueue({ sessionId: session.id, playerId, status, at });
    setLocal((prev) => ({ ...prev, ...Object.fromEntries(playerIds.map((id) => [id, { status, updatedAt: at }])) }));
    setQueued(readQueue().length);
    navigator.vibrate?.(10);
    flush();
  }

  const rekap = () =>
    buildRekap({
      groupName: session.groupName,
      sessionDate: session.date,
      startTime: session.startTime,
      location: session.location,
      rows: rows.map((r) => ({ name: r.fullName, status: r.status })),
    });

  async function copyRekap() {
    try {
      await navigator.clipboard.writeText(rekap());
      toast.success("Rekap tersalin — tempel di grup WA wali murid");
    } catch {
      toast.error("Gagal menyalin. Pakai tombol Kirim ke WA.");
    }
  }

  const q = query.trim().toLowerCase();
  const visible = rows.filter(
    (r) =>
      (filter === "all" || (filter === "belum" ? r.status === "BELUM" : r.status === "HADIR")) &&
      (!q || r.fullName.toLowerCase().includes(q) || r.nickname?.toLowerCase().includes(q) || String(r.jerseyNumber) === q)
  );
  const total = rows.length;
  const filled = total - counts.BELUM;
  const pct = total ? Math.round((filled / total) * 100) : 0;
  const bulk = counts.BELUM > 0 && (
    <Button size="md" className="col-span-2 sm:col-span-1" onClick={() => setConfirmBulk(true)}>
      <Check size={18} aria-hidden /> Sisanya Hadir ({counts.BELUM})
    </Button>
  );

  return (
    <div className="space-y-4">
      <Link href="/presensi" className="inline-flex min-h-11 items-center gap-1 text-[15px] font-semibold text-muted hover:text-ink">
        <ArrowLeft size={18} aria-hidden /> Semua sesi
      </Link>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
        <div className="min-w-0 space-y-4 pb-24 lg:pb-0">
          <section className={cn(card, "p-4 md:p-5")}>
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <CalendarDays size={22} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="eyebrow">{session.cancelled ? "Sesi libur" : "Jadwal pertemuan aktif"}</p>
                <h2 className="text-lg font-black tracking-tight">{formatDateId(session.date)}</h2>
                <p className="text-sm font-medium text-muted">
                  {[
                    session.groupName,
                    `${formatTimeId(session.startTime)} WIB`,
                    session.location,
                    session.topic,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
            <SessionSettings session={session}>{bulk}</SessionSettings>
          </section>

          {session.cancelled ? (
            <div className="rounded-2xl border border-izin/40 bg-warn-soft p-4 text-warn">
              <p className="font-bold">Sesi ini ditandai libur.</p>
              <p className="mt-1 text-[15px]">Presensi tidak diisi dan ortu tidak bisa mengajukan izin untuk tanggal ini.</p>
            </div>
          ) : (
            <>
              <section className={cn(card, "space-y-3 p-4 md:p-5")}>
                <div>
                  <p className="eyebrow">Rekap kehadiran sesi lapangan</p>
                  <h3 className="text-base font-black tracking-tight">
                    {filled} dari {total} pemain sudah terdata ({pct}%)
                  </h3>
                </div>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-ground" aria-hidden>
                  {(["HADIR", "IZIN", "SAKIT", "ALPA"] as const).map(
                    (st) => counts[st] > 0 && <span key={st} className={BAR[st]} style={{ width: `${(counts[st] / total) * 100}%` }} />
                  )}
                </div>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
                  {(Object.keys(BOX) as SheetStatus[]).map((st) => (
                    <div key={st} className={cn("rounded-xl border px-1 py-2 text-center", BOX[st])}>
                      <p className="text-[9px] font-extrabold tracking-wider uppercase sm:text-[10px]">{st === "BELUM" ? "Belum" : STATUS_LABEL[st]}</p>
                      <p className="text-xl font-black">{counts[st]}</p>
                    </div>
                  ))}
                </div>
              </section>

              <div className={cn(card, "flex flex-col gap-2 p-3 sm:flex-row")}>
                <label className="relative flex-1">
                  <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari nama atau nomor punggung"
                    className={inputClass + " pl-10"}
                    aria-label="Cari pemain"
                  />
                </label>
                <div className="flex rounded-xl border border-line bg-subtle p-1" role="tablist">
                  {(
                    [
                      ["all", `Semua ${total}`],
                      ["belum", `Belum ${counts.BELUM}`],
                      ["hadir", `Hadir ${counts.HADIR}`],
                    ] as const
                  ).map(([f, label]) => (
                    <button
                      key={f}
                      role="tab"
                      aria-selected={filter === f}
                      onClick={() => setFilter(f)}
                      className={cn(
                        "min-h-10 flex-1 rounded-lg px-3 text-sm font-bold whitespace-nowrap",
                        filter === f ? "bg-primary text-white shadow-sm" : "text-muted"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <h3 className="eyebrow px-1 pt-1">
                Daftar siswa {session.groupCode} ({total} siswa)
              </h3>
              <ul className="space-y-2">
                {visible.map((r) => (
                  <li key={r.id} className={cn(card, "p-2.5")}>
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-lg text-xs font-black",
                          r.status === "BELUM" ? "bg-ground text-muted" : BADGE[r.status]
                        )}
                      >
                        {r.jerseyNumber ?? "–"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-x-1.5 text-[15px] leading-tight font-bold break-words">
                          {r.fullName}
                          {r.source === "parent" && r.status !== "BELUM" && (
                            <span className={cn("rounded-md border px-1.5 py-px text-[10px] font-bold", PILL[r.status])}>
                              {STATUS_LABEL[r.status]} dari ortu
                            </span>
                          )}
                        </p>
                        <p className="truncate text-[11px] font-medium text-muted">
                          {[positionLabel(r.position), session.groupCode].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {BUTTONS.map((b) => {
                          const on = r.status === b.status && r.source === "coach";
                          const fromParent = r.status === b.status && r.source === "parent";
                          return (
                            <button
                              key={b.status}
                              onClick={() => mark([r.id], b.status)}
                              aria-pressed={on}
                              aria-label={`${STATUS_LABEL[b.status]} — ${r.fullName}`}
                              className={cn(
                                // 44 px lebar × 56 px tinggi: nama tetap muat di layar 360 px, sasaran jempol tetap besar.
                                "flex h-14 w-11 flex-col items-center justify-center gap-0.5 rounded-xl border-2 font-extrabold transition-transform active:scale-95 min-[400px]:w-14",
                                on
                                  ? TONE[b.status].solid
                                  : fromParent
                                    ? TONE[b.status].soft
                                    : cn("border-line bg-subtle", TONE[b.status].text)
                              )}
                            >
                              <b.icon size={18} strokeWidth={3} aria-hidden />
                              <span className="text-xs leading-none">{b.letter}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {r.source === "parent" && permissions[r.id] && (
                      <p className="mt-1.5 ml-[46px] text-xs text-muted">Alasan ortu: {permissions[r.id]!.reason}</p>
                    )}
                    {r.pending && <PendingPermission permission={r.pending} />}
                  </li>
                ))}
                {visible.length === 0 && (
                  <li className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">
                    {filter === "belum" ? "Semua anak sudah terisi. Saatnya kirim rekap." : "Tidak ada nama yang cocok."}
                  </li>
                )}
              </ul>
            </>
          )}
        </div>

        {!session.cancelled && (
          // HP: bilah progres menempel di atas bottom-nav; desktop: panel preview menempel di kanan. Satu elemen supaya status simpan tidak ganda.
          <aside
            className={cn(
              "fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex items-center justify-between gap-3 rounded-2xl border border-slate-700/80 bg-hero p-3 text-white shadow-xl",
              "lg:sticky lg:top-24 lg:inset-x-auto lg:bottom-auto lg:z-10 lg:block lg:space-y-3 lg:border-line lg:bg-card lg:p-5 lg:text-ink lg:shadow-sm"
            )}
          >
            <div className="min-w-0 lg:flex lg:items-center lg:justify-between lg:gap-3">
              <p className="eyebrow hidden lg:block">Preview pesan WhatsApp</p>
              <p className="text-xs font-bold text-slate-300 lg:hidden">Terdata</p>
              <p className="text-sm font-black lg:hidden">
                {filled} / {total} ({pct}%)
              </p>
              <SyncBadge sync={sync} queued={queued} onRetry={flush} />
            </div>
            <pre className="hidden max-h-80 overflow-auto rounded-xl border border-line bg-subtle p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-ink lg:block">
              {rekap()}
            </pre>
            <div className="flex shrink-0 gap-2 lg:grid lg:grid-cols-1">
              <Button onClick={copyRekap} className="min-h-11 px-3 lg:min-h-14 lg:w-full">
                <Copy size={18} aria-hidden /> Salin rekap
              </Button>
              <a
                href={waLink(rekap())}
                target="_blank"
                rel="noreferrer"
                aria-label="Kirim ke WA"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-hadir bg-card px-3 font-semibold text-hadir lg:min-h-14"
              >
                <Send size={18} aria-hidden /> <span className="hidden lg:inline">Kirim ke WA</span>
              </a>
            </div>
          </aside>
        )}
      </div>

      <ConfirmDialog
        open={confirmBulk}
        title={`Tandai ${counts.BELUM} anak sebagai Hadir?`}
        message="Hanya anak yang masih 'Belum' yang berubah. Status yang sudah diisi tidak tersentuh."
        confirmLabel="Ya, tandai Hadir"
        onClose={() => setConfirmBulk(false)}
        onConfirm={() => {
          mark(
            rows.filter((r) => r.status === "BELUM").map((r) => r.id),
            "HADIR"
          );
          setConfirmBulk(false);
        }}
      />
    </div>
  );
}

function SyncBadge({ sync, queued, onRetry }: { sync: Sync; queued: number; onRetry: () => void }) {
  if (sync === "offline")
    return (
      <button onClick={onRetry} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-warn-soft px-2.5 py-1 text-xs font-bold text-warn">
        <CloudOff size={14} /> {queued} di HP, menunggu sinyal
      </button>
    );
  if (sync === "error")
    return (
      <button onClick={onRetry} className="shrink-0 rounded-full bg-alpa/10 px-2.5 py-1 text-xs font-bold text-alpa">
        Gagal kirim — coba lagi
      </button>
    );
  if (sync === "saving" || queued)
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-muted">
        <Spinner size={12} /> Menyimpan
      </span>
    );
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-hadir">
      <Check size={14} /> Tersimpan
    </span>
  );
}

function PendingPermission({ permission }: { permission: Permission }) {
  const [pending, start] = useTransition();
  const decide = (accept: boolean) =>
    start(async () => {
      const r = await resolvePermission(permission.id, accept);
      if (r?.error) toast.error(r.error);
    });
  return (
    <div className="mt-2 ml-9 rounded-xl bg-warn-soft p-3 text-sm text-warn">
      <p>
        <b>Ortu mengajukan {STATUS_LABEL[permission.type].toLowerCase()}</b> setelah presensi diisi: “{permission.reason}”
      </p>
      <div className="mt-2 flex gap-2">
        <Button size="md" onClick={() => decide(true)} loading={pending}>
          Terima
        </Button>
        <Button size="md" variant="outline" onClick={() => decide(false)} disabled={pending}>
          Abaikan
        </Button>
      </div>
    </div>
  );
}

function SessionSettings({ session, children }: { session: Props["session"]; children?: React.ReactNode }) {
  const [pending, start] = useTransition();
  const [libur, startLibur] = useTransition();
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState(session.startTime.slice(0, 5));
  const [location, setLocation] = useState(session.location ?? "");
  const [topic, setTopic] = useState(session.topic ?? "");

  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {children}
        <Button
          type="button"
          variant="outline"
          size="md"
          loading={libur}
          onClick={() =>
            startLibur(async () => {
              await setSessionCancelled(session.id, !session.cancelled);
              toast.success(session.cancelled ? "Sesi dibuka lagi" : "Sesi ditandai libur");
            })
          }
          className={session.cancelled ? undefined : "border-alpa/30 bg-alpa/10 text-alpa hover:bg-alpa/15"}
        >
          {!libur && <Minus size={18} aria-hidden />} {session.cancelled ? "Batalkan libur" : "Tandai libur"}
        </Button>
        <Button type="button" variant="outline" size="md" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <Settings2 size={18} aria-hidden /> Atur sesi
        </Button>
      </div>
      {open && (
        <form
          className="grid gap-3 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await updateSessionInfo(session.id, { startTime: time, location, topic });
              if (r?.error) toast.error(r.error);
              else toast.success("Info sesi disimpan");
            });
          }}
        >
          <Field label="Jam mulai">
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Lokasi">
            <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Materi latihan">
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="mis. Passing pendek" className={inputClass} />
          </Field>
          <div className="sm:col-span-3">
            <Button type="submit" loading={pending}>
              Simpan info
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
