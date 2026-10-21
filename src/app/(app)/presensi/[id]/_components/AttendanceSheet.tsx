"use client";

import { ArrowLeft, Check, CloudOff, Copy, Hand, Minus, Plus, Search, Send, Settings2, X } from "lucide-react";
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
  };
  roster: { id: string; fullName: string; nickname: string | null; jerseyNumber: number | null }[];
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
const TONE: Record<SheetStatus, { solid: string; text: string; border: string }> = {
  HADIR: { solid: "bg-hadir border-hadir text-white", text: "text-hadir", border: "border-l-hadir" },
  IZIN: { solid: "bg-izin border-izin text-white", text: "text-izin", border: "border-l-izin" },
  SAKIT: { solid: "bg-sakit border-sakit text-white", text: "text-sakit", border: "border-l-sakit" },
  ALPA: { solid: "bg-alpa border-alpa text-white", text: "text-alpa", border: "border-l-alpa" },
  BELUM: { solid: "bg-belum border-belum text-white", text: "text-belum", border: "border-l-transparent" },
};

type Sync = "saved" | "saving" | "offline" | "error";
const PAGE_CACHE = "talenta-bola-pages";

export function AttendanceSheet({ session, roster, serverMarks, permissions }: Props) {
  const router = useRouter();
  const [local, setLocal] = useState<Record<string, Mark>>({});
  const [sync, setSync] = useState<Sync>("saved");
  const [queued, setQueued] = useState(0);
  const [filter, setFilter] = useState<"all" | "belum">("all");
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
      (filter === "all" || r.status === "BELUM") &&
      (!q || r.fullName.toLowerCase().includes(q) || r.nickname?.toLowerCase().includes(q) || String(r.no) === q)
  );

  return (
    <div className="-mx-4 lg:mx-0">
      <div className="px-4 lg:px-0">
        <Link href="/presensi" className="mb-2 inline-flex min-h-11 items-center gap-1 text-[15px] font-semibold text-muted">
          <ArrowLeft size={18} /> Semua sesi
        </Link>
        <h2 className="text-2xl font-extrabold tracking-tight">{formatDateId(session.date)}</h2>
        <p className="text-muted">
          {session.groupName} · {formatTimeId(session.startTime)}
          {session.location ? ` · ${session.location}` : ""}
          {session.topic ? ` · ${session.topic}` : ""}
        </p>
        <SessionSettings session={session} />
      </div>

      {session.cancelled ? (
        <div className="mx-4 mt-4 rounded-2xl border border-izin/40 bg-warn-soft p-4 text-warn lg:mx-0">
          <p className="font-bold">Sesi ini ditandai libur.</p>
          <p className="mt-1 text-[15px]">Presensi tidak diisi dan ortu tidak bisa mengajukan izin untuk tanggal ini.</p>
        </div>
      ) : (
        <>
          {/* Hitungan berjalan menempel di atas: pelatih tahu sisa berapa tanpa scroll. */}
          <div className="sticky top-[61px] z-20 mt-4 border-y border-line bg-card/95 px-4 py-2.5 backdrop-blur lg:top-0 lg:rounded-2xl lg:border">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[15px] font-bold">
                <span className="text-hadir">Hadir {counts.HADIR}</span>
                <span className="text-izin">Izin {counts.IZIN}</span>
                <span className="text-sakit">Sakit {counts.SAKIT}</span>
                <span className="text-alpa">Alpa {counts.ALPA}</span>
                <span className="text-muted">Belum {counts.BELUM}</span>
              </div>
              <SyncBadge sync={sync} queued={queued} onRetry={flush} />
            </div>
          </div>

          <div className="mt-3 flex gap-2 px-4 lg:px-0">
            <label className="relative flex-1">
              <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama / nomor"
                className={inputClass + " pl-10"}
                aria-label="Cari pemain"
              />
            </label>
            <div className="flex rounded-xl border border-line bg-card p-1" role="tablist">
              {(["all", "belum"] as const).map((f) => (
                <button
                  key={f}
                  role="tab"
                  aria-selected={filter === f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "min-h-10 rounded-lg px-3 text-sm font-semibold",
                    filter === f ? "bg-primary text-white" : "text-muted"
                  )}
                >
                  {f === "all" ? "Semua" : `Belum (${counts.BELUM})`}
                </button>
              ))}
            </div>
          </div>

          <ul className="mt-3 space-y-2 px-4 lg:px-0">
            {visible.map((r) => (
              <li
                key={r.id}
                className={cn("rounded-2xl border border-l-[6px] border-line bg-card p-2.5 pl-3", TONE[r.status].border)}
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 shrink-0 text-center text-sm font-bold text-muted">{r.no}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] leading-tight font-bold break-words">{r.fullName}</p>
                    <p className={cn("text-sm font-semibold", TONE[r.status].text)}>
                      {r.status === "BELUM" ? "Belum" : STATUS_LABEL[r.status]}
                      {r.source === "parent" && " · dari ortu"}
                      {r.jerseyNumber ? <span className="font-normal text-muted"> · #{r.jerseyNumber}</span> : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {BUTTONS.map((b) => {
                      const on = r.status === b.status && r.source === "coach";
                      return (
                        <button
                          key={b.status}
                          onClick={() => mark([r.id], b.status)}
                          aria-pressed={on}
                          aria-label={`${STATUS_LABEL[b.status]} — ${r.fullName}`}
                          className={cn(
                            // 44 px lebar × 56 px tinggi: nama tetap muat di layar 360 px, sasaran jempol tetap besar.
                            "flex h-14 w-11 flex-col items-center justify-center gap-0.5 rounded-xl border-2 font-extrabold transition-transform active:scale-95 min-[400px]:w-14",
                            on ? TONE[b.status].solid : cn("border-line bg-card", TONE[b.status].text)
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
                  <p className="mt-1.5 ml-9 text-sm text-muted">Alasan ortu: {permissions[r.id]!.reason}</p>
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

          <div className="mt-4 space-y-2 px-4 lg:px-0">
            {counts.BELUM > 0 && (
              <Button variant="outline" size="lg" className="w-full" onClick={() => setConfirmBulk(true)}>
                <Check size={20} aria-hidden /> Tandai sisa {counts.BELUM} anak sebagai Hadir
              </Button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button size="lg" onClick={copyRekap}>
                <Copy size={20} aria-hidden /> Salin rekap
              </Button>
              <a
                href={waLink(rekap())}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border border-hadir bg-card px-4 font-semibold text-hadir"
              >
                <Send size={20} aria-hidden /> Kirim ke WA
              </a>
            </div>
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
        </>
      )}
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

function SessionSettings({ session }: { session: Props["session"] }) {
  const [pending, start] = useTransition();
  const [time, setTime] = useState(session.startTime.slice(0, 5));
  const [location, setLocation] = useState(session.location ?? "");
  const [topic, setTopic] = useState(session.topic ?? "");

  return (
    <details className="mt-2">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-[15px] font-semibold text-primary">
        <Settings2 size={18} aria-hidden /> Atur sesi (jam, lokasi, libur)
      </summary>
      <form
        className="mt-2 grid gap-3 rounded-2xl border border-line bg-card p-4 sm:grid-cols-3"
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
        <div className="flex flex-wrap gap-2 sm:col-span-3">
          <Button type="submit" loading={pending}>
            Simpan info
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await setSessionCancelled(session.id, !session.cancelled);
                toast.success(session.cancelled ? "Sesi dibuka lagi" : "Sesi ditandai libur");
              })
            }
          >
            <Minus size={18} aria-hidden /> {session.cancelled ? "Batalkan libur" : "Tandai libur (hujan, dll)"}
          </Button>
        </div>
      </form>
    </details>
  );
}
