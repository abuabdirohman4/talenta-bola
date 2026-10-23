"use client";

import { CalendarDays, Check, CloudOff, Copy, Search, Send, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, inputClass } from "@/components/ui/Field";
import {
  countStatuses,
  resolveStatus,
  STATUS_LABEL,
  NOTE_MAX,
  type Mark,
  type Permission,
  type SheetStatus,
  type Status,
} from "@/lib/attendance";
import { formatDateId, formatTimeId } from "@/lib/format";
import { positionLabel } from "@/lib/players";
import { buildRekap } from "@/lib/rekap";
import { cn, waLink } from "@/lib/utils";
import { resolvePermission, updateSessionInfo } from "../../actions";
import { CancelSessionButton } from "../../_components/SessionControls";
import { enqueue, readQueue, sendQueue } from "./offline-queue";

type Props = {
  session: {
    id: string;
    date: string;
    startTime: string;
    location: string | null;
    topic: string | null;
    cancelled: boolean;
    cancelReason: string | null;
    groupName: string;
    groupCode: string;
  };
  roster: { id: string; fullName: string; nickname: string | null; jerseyNumber: number | null; position: string | null }[];
  serverMarks: Record<string, Mark>;
  permissions: Record<string, Permission>;
};

const BUTTONS: { status: Status; letter: string }[] = [
  { status: "HADIR", letter: "H" },
  { status: "IZIN", letter: "I" },
  { status: "SAKIT", letter: "S" },
  { status: "ALPA", letter: "A" },
];

// Kelas lengkap ditulis eksplisit supaya ikut dipindai Tailwind.
const TONE: Record<Status, { solid: string; soft: string; text: string }> = {
  HADIR: { solid: "bg-hadir border-hadir text-white dark:text-ground", soft: "bg-hadir/15 border-hadir/50 text-hadir", text: "text-hadir" },
  IZIN: { solid: "bg-izin border-izin text-white dark:text-ground", soft: "bg-izin/15 border-izin/50 text-izin", text: "text-izin" },
  SAKIT: { solid: "bg-sakit border-sakit text-white dark:text-ground", soft: "bg-sakit/15 border-sakit/50 text-sakit", text: "text-sakit" },
  ALPA: { solid: "bg-alpa border-alpa text-white dark:text-ground", soft: "bg-alpa/15 border-alpa/50 text-alpa", text: "text-alpa" },
};
const card = "rounded-2xl border border-line bg-card shadow-sm";

type Sync = "saved" | "saving" | "offline" | "error";
const PAGE_CACHE = "talenta-bola-pages";

export function AttendanceSheet({ session, roster, serverMarks, permissions }: Props) {
  const router = useRouter();
  const [local, setLocal] = useState<Record<string, Mark>>({});
  const [sync, setSync] = useState<Sync>("saved");
  const [queued, setQueued] = useState(0);
  const [query, setQuery] = useState("");
  // Urutan dibekukan saat judul kolom diketuk, supaya baris tidak melompat di bawah jari ketika status diubah.
  const [sort, setSort] = useState<{ key: "name" | Status; desc: boolean; order: string[] } | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(session.cancelled);
  const flushing = useRef(false);

  // Tap yang belum terkirim (mis. HP sempat offline lalu halaman dibuka ulang) tetap ditampilkan.
  useEffect(() => {
    const mine = readQueue().filter((m) => m.sessionId === session.id);
    if (mine.length) {
      setLocal(Object.fromEntries(mine.map((m) => [m.playerId, { status: m.status, updatedAt: m.at, note: m.note }])));
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
        const res = resolveStatus(mark, permissions[p.id]);
        // Catatan: alasan izin dari pelatih, atau alasan yang ditulis ortu kalau statusnya dari ortu.
        const note = res.source === "coach" ? (mark?.note ?? null) : res.source === "parent" ? permissions[p.id]!.reason : null;
        return { ...p, no: i + 1, ...res, note };
      }),
    [roster, serverMarks, local, permissions]
  );
  const counts = countStatuses(rows.map((r) => r.status));

  /** note undefined = pertahankan alasan lama kalau statusnya tidak berubah. */
  function mark(playerIds: string[], status: Status, note?: string | null) {
    const at = Date.now();
    const notes = Object.fromEntries(
      playerIds.map((id) => {
        const row = rows.find((r) => r.id === id);
        const keep = row?.source === "coach" && row.status === status ? row.note : null;
        return [id, status === "IZIN" ? (note === undefined ? keep : note) : null];
      })
    );
    for (const playerId of playerIds) enqueue({ sessionId: session.id, playerId, status, at, note: notes[playerId] });
    setLocal((prev) => ({
      ...prev,
      ...Object.fromEntries(playerIds.map((id) => [id, { status, updatedAt: at, note: notes[id] }])),
    }));
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
      rows: rows.map((r) => ({ name: r.fullName, status: r.status === "BELUM" ? "ALPA" : r.status, note: r.note })),
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
  const shownStatus = (r: (typeof rows)[number]): Status => (r.status === "BELUM" ? "ALPA" : r.status);
  const displayName = (r: (typeof rows)[number]) => r.nickname || r.fullName;
  function sortBy(key: "name" | Status) {
    // Ketuk lagi: nama dibalik Z–A; status kembali ke urutan asal.
    if (sort?.key === key && (key !== "name" || sort.desc)) return setSort(null);
    const desc = sort?.key === key;
    const byName = (a: (typeof rows)[number], b: (typeof rows)[number]) => displayName(a).localeCompare(displayName(b), "id");
    const sorted = [...rows].sort((a, b) =>
      key === "name"
        ? byName(a, b) * (desc ? -1 : 1)
        : Number(shownStatus(b) === key) - Number(shownStatus(a) === key) || byName(a, b)
    );
    setSort({ key, desc, order: sorted.map((r) => r.id) });
  }
  const rank = new Map(sort?.order.map((id, i) => [id, i]));
  const visible = [...rows].sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0)).filter(
    (r) =>
      (!q || r.fullName.toLowerCase().includes(q) || r.nickname?.toLowerCase().includes(q) || String(r.jerseyNumber) === q)
  );
  const total = rows.length;
  // Seperti Generus Mandiri: anak yang belum ditandai dihitung Alpa.
  const alpa = counts.ALPA + counts.BELUM;
  const pct = total ? Math.round((counts.HADIR / total) * 100) : 0;
  const pctTone = pct >= 80 ? "bg-hadir/15 text-hadir" : pct >= 60 ? "bg-izin/15 text-izin" : "bg-alpa/15 text-alpa";

  return (
    <div className="space-y-4">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
        <div className="min-w-0 space-y-3 pb-24 lg:space-y-4 lg:pb-0">
          <section className={cn(card, "p-3 md:p-4")}>
            <div className="flex items-center gap-3">
              <span className="hidden size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary sm:grid">
                <CalendarDays size={22} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-black tracking-tight md:text-lg">
                  {formatDateId(session.date)}
                  {session.cancelled && <span className="text-warn"> · Libur</span>}
                </h2>
                <p className="line-clamp-2 text-xs font-medium text-muted md:text-sm">
                  {[session.groupName, `${formatTimeId(session.startTime)} WIB`, session.location, session.topic]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                aria-expanded={settingsOpen}
                aria-label="Atur sesi"
                onClick={() => setSettingsOpen((o) => !o)}
                className={cn("shrink-0 px-3", settingsOpen && "border-primary text-primary")}
              >
                <Settings2 size={18} aria-hidden /> <span className="hidden sm:inline">Atur sesi</span>
              </Button>
            </div>
            {settingsOpen && <SessionSettings session={session} />}
          </section>

          {session.cancelled ? (
            <div className="rounded-2xl border border-izin/40 bg-warn-soft p-4 text-warn">
              <p className="font-bold">Sesi ini ditandai libur.</p>
              {session.cancelReason && <p className="mt-1 text-[15px] font-semibold">Alasan: {session.cancelReason}</p>}
              <p className="mt-1 text-[15px]">Presensi tidak diisi dan ortu tidak bisa mengajukan izin untuk tanggal ini.</p>
            </div>
          ) : (
            <>
              {/* Kartu ringkasan pola Generus Mandiri: judul, satu baris angka, persen kehadiran. */}
              <section className={cn(card, "flex items-center justify-between gap-3 px-4 py-3")}>
                <div className="min-w-0">
                  <h3 className="text-base font-bold">Pemain ({total} anak)</h3>
                  <p className="text-sm text-muted">
                    {counts.HADIR} hadir, {alpa} alpa, {counts.IZIN} izin, {counts.SAKIT} sakit
                  </p>
                </div>
                <div className="shrink-0 text-center">
                  <p className="text-xs text-muted">Kehadiran</p>
                  <p className={cn("rounded-full px-3 py-1 text-sm font-bold", pctTone)}>{pct}%</p>
                </div>
              </section>

              <div className="flex gap-2">
                <label className="relative min-w-0 flex-1">
                  <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari nama / nomor"
                    className={inputClass + " pl-10"}
                    aria-label="Cari pemain"
                  />
                </label>
                {counts.BELUM > 0 && (
                  <Button variant="outline" className="shrink-0 px-3 whitespace-nowrap" onClick={() => setConfirmBulk(true)}>
                    <Check size={18} className="text-hadir" aria-hidden /> Hadir semua
                  </Button>
                )}
              </div>

              <datalist id="izin-alasan">
                {REASONS.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
              <div className={cn(card, "overflow-hidden")}>
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    Presensi {session.groupCode}, {total} anak
                  </caption>
                  <thead className="border-b border-line bg-subtle text-xs font-bold text-muted">
                    <tr>
                      <th
                        scope="col"
                        className="py-0 pl-3 text-left"
                        aria-sort={sort?.key === "name" ? (sort.desc ? "descending" : "ascending") : "none"}
                      >
                        <button type="button" onClick={() => sortBy("name")} className="min-h-11 pr-2 font-bold">
                          Nama {sort?.key === "name" ? (sort.desc ? "↓" : "↑") : ""}
                        </button>
                      </th>
                      {BUTTONS.map((b) => (
                        <th key={b.status} scope="col" className="w-11 p-0 text-center">
                          <button
                            type="button"
                            onClick={() => sortBy(b.status)}
                            aria-label={`Urutkan: ${STATUS_LABEL[b.status]} di atas`}
                            aria-pressed={sort?.key === b.status}
                            className={cn("min-h-11 w-11 font-bold", sort?.key === b.status && cn("underline underline-offset-4", TONE[b.status].text))}
                          >
                            {b.letter}
                          </button>
                        </th>
                      ))}
                      <th aria-hidden className="w-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {visible.map((r) => {
                      const meta =
                        r.source === "parent" && r.status !== "BELUM"
                          ? `${STATUS_LABEL[r.status]} dari ortu`
                          : [r.jerseyNumber != null && `#${r.jerseyNumber}`, positionLabel(r.position)].filter(Boolean).join(" · ");
                      // Belum ditandai = Alpa (tampil samar); izin ortu tampil samar sampai pelatih menekan.
                      const shown = shownStatus(r);
                      const extra =
                        (r.source === "parent" && permissions[r.id]) || (r.source === "coach" && r.status === "IZIN") || r.pending;
                      return (
                        <Fragment key={r.id}>
                          <tr>
                            <td className="max-w-0 py-1 pl-3">
                              {/* Panggilan dulu (yang dipakai di lapangan); nama lengkap tetap di rekap. */}
                              <p className="truncate font-semibold" title={r.fullName}>
                                {r.nickname || r.fullName}
                              </p>
                              {meta && (
                                <p className={cn("truncate text-xs", r.source === "parent" ? TONE[r.status as Status].text : "text-muted")}>
                                  {meta}
                                </p>
                              )}
                            </td>
                            {BUTTONS.map((b) => {
                              const active = shown === b.status;
                              const firm = active && r.source === "coach";
                              return (
                                <td key={b.status} className="p-0 text-center">
                                  <button
                                    onClick={() => mark([r.id], b.status)}
                                    aria-pressed={firm}
                                    aria-label={`${STATUS_LABEL[b.status]} — ${r.fullName}`}
                                    // Area ketuk 44 × 56 px untuk dipakai satu tangan; lingkarannya kecil supaya tenang.
                                    className="grid h-14 w-11 place-items-center"
                                  >
                                    <span
                                      className={cn(
                                        "grid size-8 place-items-center rounded-full border text-xs font-bold transition-transform active:scale-90",
                                        firm ? TONE[b.status].solid : active ? TONE[b.status].soft : "border-line text-muted/60"
                                      )}
                                    >
                                      {b.letter}
                                    </span>
                                  </button>
                                </td>
                              );
                            })}
                            <td aria-hidden />
                          </tr>
                          {extra && (
                            <tr>
                              <td colSpan={6} className="pr-3 pb-2 pl-3">
                                {r.source === "parent" && permissions[r.id] && (
                                  <p className="text-xs text-muted">Alasan ortu: {permissions[r.id]!.reason}</p>
                                )}
                                {r.source === "coach" && r.status === "IZIN" && (
                                  <IzinReason key={r.note ?? ""} note={r.note} onChange={(n) => mark([r.id], "IZIN", n)} />
                                )}
                                {r.pending && <PendingPermission permission={r.pending} />}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                    {visible.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-muted">
                          Tidak ada nama yang cocok.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {!session.cancelled && (
          // HP: dua tombol melayang di atas bottom-nav; desktop: panel preview pesan menempel di kanan.
          <aside
            className={cn(
              "fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-2",
              "lg:sticky lg:top-24 lg:inset-x-auto lg:bottom-auto lg:z-10 lg:block lg:space-y-3 lg:rounded-2xl lg:border lg:border-line lg:bg-card lg:p-5 lg:shadow-sm"
            )}
          >
            {/* Hanya muncul saat ada masalah; di sini selalu terlihat walau daftar sudah di-scroll. */}
            <SyncBadge sync={sync} queued={queued} onRetry={flush} />
            <p className="eyebrow hidden lg:block">Preview pesan WhatsApp</p>
            <pre className="hidden max-h-80 overflow-auto rounded-xl border border-line bg-subtle p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-ink lg:block">
              {rekap()}
            </pre>
            <div className="flex min-w-0 flex-1 gap-2 lg:grid lg:grid-cols-1">
              <Button onClick={copyRekap} className="flex-1 rounded-full px-4 shadow-lg lg:min-h-14 lg:w-full lg:rounded-xl lg:shadow-md">
                <Copy size={18} aria-hidden /> Salin rekap
              </Button>
              <a
                href={waLink(rekap())}
                target="_blank"
                rel="noreferrer"
                aria-label="Kirim ke WA"
                className="inline-flex size-11 shrink-0 items-center justify-center gap-2 rounded-full border border-hadir bg-card font-semibold text-hadir shadow-lg lg:h-14 lg:w-full lg:rounded-xl lg:shadow-none"
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
        message="Hanya anak yang belum ditandai. Yang sudah Izin, Sakit, atau Alpa tidak berubah."
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
      <button onClick={onRetry} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-izin/40 bg-warn-soft px-3 text-xs font-bold text-warn shadow-md lg:min-h-0 lg:py-1 lg:shadow-none">
        <CloudOff size={14} /> {queued} belum terkirim<span className="hidden lg:inline">, menunggu sinyal</span>
      </button>
    );
  if (sync === "error")
    return (
      <button onClick={onRetry} className="min-h-11 shrink-0 rounded-full border border-alpa/40 bg-card px-3 text-xs font-bold text-alpa shadow-md lg:min-h-0 lg:py-1 lg:shadow-none">
        Gagal kirim<span className="hidden lg:inline"> — coba lagi</span>
      </button>
    );
  // Menyimpan/tersimpan normal tanpa tanda; yang tampil hanya masalah (tanpa sinyal, gagal kirim).
  return null;
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

const REASONS = ["Sekolah", "Acara keluarga", "Les", "Pulang kampung", "Bepergian"];

/** Alasan izin opsional, satu isian dengan saran bawaan; tersimpan lewat antrean presensi yang sama. */
function IzinReason({ note, onChange }: { note: string | null; onChange: (note: string | null) => void }) {
  const [text, setText] = useState(note ?? "");
  return (
    <input
      value={text}
      list="izin-alasan"
      maxLength={NOTE_MAX}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => text.trim() !== (note ?? "") && onChange(text.trim() || null)}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      placeholder="Alasan izin (opsional), mis. sekolah"
      aria-label="Alasan izin"
      className={cn(inputClass, "min-h-11 py-1.5")}
    />
  );
}

function SessionSettings({ session }: { session: Props["session"] }) {
  const [pending, start] = useTransition();
  const [time, setTime] = useState(session.startTime.slice(0, 5));
  const [location, setLocation] = useState(session.location ?? "");
  const [topic, setTopic] = useState(session.topic ?? "");

  return (
    <div className="mt-3 border-t border-line pt-3">
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
          <div className="flex flex-wrap gap-2 sm:col-span-3">
            <Button type="submit" loading={pending}>
              Simpan info
            </Button>
            <CancelSessionButton sessionId={session.id} cancelled={session.cancelled} className="px-3 whitespace-nowrap" />
          </div>
      </form>
    </div>
  );
}
