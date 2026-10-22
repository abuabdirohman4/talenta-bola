"use client";

import { AlertCircle, Check, ChevronLeft, ChevronRight, Eye, Plus, Search, Send, Star, Undo2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { DEFAULT_SCORE, groupAverage, NARRATIVE_FIELDS, RUBRIC, SCORE_LABEL, type NarrativeKey } from "@/lib/rubric";
import { cn, waLink } from "@/lib/utils";
import { saveNarrative, saveScore, setPublished } from "../../../actions";

type RosterRow = {
  id: string;
  name: string;
  jersey: number | null;
  position: string | null;
  rate: number | null;
  status: "published" | "draft" | "none";
  scores: Record<string, number>;
};

const card = "rounded-2xl border border-line bg-card shadow-sm";
const DOT = ["bg-primary", "bg-info", "bg-sakit"];

/** Rata-rata semua aspek; yang belum disentuh pelatih dihitung nilai default. */
const overall = (scores: Record<string, number>) => {
  const all = RUBRIC.flatMap((g) => g.aspects);
  return Math.round((all.reduce((s, a) => s + (scores[a.key] ?? DEFAULT_SCORE), 0) / all.length) * 10) / 10;
};

type Props = {
  period: { id: string; name: string };
  player: {
    id: string;
    fullName: string;
    photoUrl: string | null;
    position: string | null;
    jerseyNumber: number | null;
    parentPhoneWa: string | null;
  };
  roster: RosterRow[];
  nav: { index: number; total: number; prevId: string | null; nextId: string | null };
  attendance: { hadir: number; held: number; rate: number | null };
  initial: {
    scores: Record<string, number>;
    narrative: Record<NarrativeKey, string>;
    publishedAt: string | null;
    publicToken: string | null;
  };
  baseUrl: string;
  ssbName: string;
};

export function ReportForm({ period, player, roster, nav, attendance, initial, baseUrl, ssbName }: Props) {
  const ref = { periodId: period.id, playerId: player.id };
  const [scores, setScores] = useState(initial.scores);
  const [narrative, setNarrative] = useState(initial.narrative);
  const [inflight, setInflight] = useState(0);
  const [failed, setFailed] = useState(false);
  const [published, setPub] = useState(!!initial.publishedAt);
  const [token, setToken] = useState(initial.publicToken);
  const [q, setQ] = useState("");
  const [publishing, startPublish] = useTransition();
  const timers = useRef<Partial<Record<NarrativeKey, ReturnType<typeof setTimeout>>>>({});
  const latest = useRef(narrative);
  latest.current = narrative;

  // Simpan otomatis per perubahan; tidak ada tombol Simpan yang bisa terlupa.
  async function persist(run: () => Promise<{ error: string } | undefined>) {
    setInflight((n) => n + 1);
    try {
      const r = await run();
      if (r?.error) throw new Error(r.error);
      setFailed(false);
    } catch (e) {
      setFailed(true);
      toast.error(e instanceof Error && e.message !== "Unauthorized" ? e.message : "Gagal menyimpan — cek sinyal lalu ulangi");
    } finally {
      setInflight((n) => n - 1);
    }
  }

  function rate(aspectKey: string, score: number) {
    setScores((s) => ({ ...s, [aspectKey]: score }));
    persist(() => saveScore(ref, aspectKey, score));
  }

  function editNarrative(field: NarrativeKey, value: string) {
    setNarrative((n) => ({ ...n, [field]: value }));
    clearTimeout(timers.current[field]);
    timers.current[field] = setTimeout(() => persist(() => saveNarrative(ref, field, latest.current[field])), 700);
  }

  // Ketikan terakhir jangan hilang saat pindah anak sebelum jeda simpan habis.
  useEffect(() => {
    const t = timers.current;
    return () => {
      for (const [field, timer] of Object.entries(t)) {
        if (!timer) continue;
        clearTimeout(timer);
        saveNarrative(ref, field as NarrativeKey, latest.current[field as NarrativeKey]);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shareUrl = token ? `${baseUrl}/r/${token}` : "";
  const shareText = `Assalamu'alaikum Ayah/Bunda. Rapor perkembangan ${player.fullName} (${period.name}) dari ${ssbName} sudah terbit:\n\n${shareUrl}`;

  function publish(value: boolean) {
    startPublish(async () => {
      for (const t of Object.values(timers.current)) if (t) clearTimeout(t);
      await Promise.all(NARRATIVE_FIELDS.map((f) => saveNarrative(ref, f.key, latest.current[f.key])));
      const r = await setPublished(ref, value);
      if (r.error) return void toast.error(r.error);
      setPub(value);
      setToken(r.publicToken ?? null);
      toast.success(value ? "Rapor terbit — sekarang bisa dibuka ortu" : "Rapor ditarik kembali");
    });
  }

  const avg = overall(scores);
  const touchedAny = Object.keys(scores).length > 0 || NARRATIVE_FIELDS.some((f) => narrative[f.key].trim());
  const liveStatus = published ? "published" : touchedAny ? "draft" : "none";
  const rows = roster
    .map((r) => (r.id === player.id ? { ...r, status: liveStatus as RosterRow["status"], scores } : r))
    .filter((r) => r.name.toLowerCase().includes(q.trim().toLowerCase()));
  const done = roster.filter((r) => (r.id === player.id ? liveStatus : r.status) !== "none").length;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[22rem_1fr]">
      {/* Roster periode — hanya desktop; di HP pindah anak lewat panah. */}
      <aside className={cn(card, "hidden max-h-[calc(100dvh-7rem)] flex-col p-4 lg:sticky lg:top-24 lg:flex")}>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-xs font-extrabold tracking-wider uppercase">Roster periode ({roster.length} siswa)</h3>
            <p className="text-[11px] font-medium text-muted">Pilih siswa untuk menilai</p>
          </div>
          <span className="shrink-0 rounded-md border border-primary/30 bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary">
            {done} dinilai
          </span>
        </div>
        <label className="relative mb-3 block">
          <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama siswa…"
            aria-label="Cari nama siswa"
            className={cn(inputClass, "py-2 pl-9 text-sm")}
          />
        </label>
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
          {rows.map((r) => {
            const current = r.id === player.id;
            return (
              <li key={r.id}>
                <Link
                  href={`/rapor/${period.id}/${r.id}`}
                  aria-current={current ? "true" : undefined}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-xl border p-2.5",
                    current ? "border-primary bg-primary-soft" : "border-line bg-subtle hover:border-muted/40"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-lg text-xs font-black",
                        current ? "bg-primary text-white" : "bg-ground"
                      )}
                    >
                      {r.jersey ?? "–"}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{r.name}</span>
                      <span className="block truncate text-[11px] font-medium text-muted">
                        {[r.position, r.rate != null ? `Hadir ${r.rate}%` : null].filter(Boolean).join(" · ") || "–"}
                      </span>
                    </span>
                  </span>
                  <RosterPill status={r.status} avg={overall(r.scores)} />
                </Link>
              </li>
            );
          })}
          {rows.length === 0 && <li className="rounded-xl bg-subtle p-3 text-sm text-muted">Tidak ada nama yang cocok.</li>}
        </ul>
      </aside>

      <div className="min-w-0 space-y-4">
        <section className={cn(card, "p-4 md:p-5")}>
          <div className="flex items-center gap-2 md:gap-3">
            <NavButton href={nav.prevId && `/rapor/${period.id}/${nav.prevId}`} label="Anak sebelumnya">
              <ChevronLeft />
            </NavButton>
            <div className="flex min-w-0 flex-1 items-center gap-3 md:justify-center">
              {player.jerseyNumber ? (
                <span className="grid size-14 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary-soft text-lg font-black text-primary">
                  #{player.jerseyNumber}
                </span>
              ) : (
                <Avatar name={player.fullName} photoUrl={player.photoUrl} className="size-14 rounded-xl text-lg" />
              )}
              <div className="min-w-0">
                <h2 className="flex flex-wrap items-center gap-x-2 text-lg font-black tracking-tight">
                  <span className="truncate">{player.fullName}</span>
                  {player.position && (
                    <span className="rounded-md border border-line bg-subtle px-2 py-0.5 text-[11px] font-bold text-muted">
                      {player.position}
                    </span>
                  )}
                </h2>
                <p className="text-xs font-medium text-muted">
                  {attendance.held
                    ? `Presensi: ${attendance.rate}% (${attendance.hadir}/${attendance.held} sesi)`
                    : "Belum ada sesi di periode ini"}
                  {" · "}
                  {period.name}
                </p>
              </div>
            </div>
            <NavButton href={nav.nextId && `/rapor/${period.id}/${nav.nextId}`} label="Anak berikutnya">
              <ChevronRight />
            </NavButton>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line pt-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-muted">
                Anak {nav.index + 1} dari {nav.total}
              </p>
              <SaveState inflight={inflight} failed={failed} />
            </div>
            <p className="flex items-baseline gap-2">
              <span className="eyebrow">Rata-rata skor saat ini</span>
              <span className="text-2xl font-black text-primary">{avg.toFixed(1)}</span>
              <span className="text-xs text-muted">/ 5.0</span>
              <span className="rounded-md border border-primary/30 bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary">
                {SCORE_LABEL[Math.round(avg)]}
              </span>
            </p>
          </div>
        </section>

        <p className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary-soft p-3 text-sm text-ink">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden />
          Semua aspek mulai dari 3 bintang (Cukup). Ubah yang menonjol saja — yang belum disentuh tampak pudar.
        </p>

        {RUBRIC.map((g, gi) => (
          <section key={g.key} className={card}>
            <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
              <h3 className="flex items-center gap-2 text-xs font-extrabold tracking-wider uppercase">
                <span className={cn("size-2 rounded-full", DOT[gi % DOT.length])} aria-hidden />
                {gi + 1}. {g.label}
              </h3>
              <span className="rounded-md border border-line bg-subtle px-2 py-0.5 text-[11px] font-bold text-muted">
                Rata-rata {groupAverage(g, scores).toFixed(1)}
              </span>
            </header>
            <ul className="divide-y divide-line">
              {g.aspects.map((a) => {
                const touched = scores[a.key] !== undefined;
                const value = scores[a.key] ?? DEFAULT_SCORE;
                return (
                  <li key={a.key} className="flex flex-col gap-0.5 px-5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="flex items-baseline justify-between gap-2 sm:block">
                      <span className="text-sm font-bold">{a.label}</span>
                      <span className={cn("text-xs sm:block", touched ? "font-semibold text-ink" : "text-muted")}>{SCORE_LABEL[value]}</span>
                    </div>
                    <div className={cn("flex shrink-0 gap-0.5", !touched && "opacity-45")} role="radiogroup" aria-label={a.label}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          role="radio"
                          aria-checked={value === n}
                          aria-label={`${n} bintang — ${SCORE_LABEL[n]}`}
                          onClick={() => rate(a.key, n)}
                          className="grid size-11 place-items-center rounded-lg active:scale-90 sm:size-10"
                        >
                          <Star
                            size={28}
                            className={n <= value ? "fill-izin text-izin" : "text-line"}
                            strokeWidth={1.75}
                            aria-hidden
                          />
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        <section className={cn(card, "space-y-5 p-5")}>
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
            <h3 className="text-xs font-extrabold tracking-wider uppercase">Catatan narasi pelatih</h3>
            <p className="text-[11px] font-medium text-muted">Bagian yang paling dibaca ortu</p>
          </div>
          {NARRATIVE_FIELDS.map((f) => (
            <div key={f.key}>
              <label htmlFor={f.key} className="mb-1.5 block text-sm font-bold">
                {f.label}
              </label>
              <p className="eyebrow mb-1.5">Bank narasi cepat (klik untuk tambah)</p>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {f.bank.map((sentence) => {
                  const used = narrative[f.key].includes(sentence);
                  return (
                    <button
                      key={sentence}
                      type="button"
                      disabled={used}
                      onClick={() => editNarrative(f.key, [narrative[f.key].trim(), sentence].filter(Boolean).join(" "))}
                      className={cn(
                        "inline-flex min-h-9 items-center gap-1 rounded-lg border px-3 py-1 text-left text-xs font-semibold",
                        used ? "border-line bg-subtle text-muted" : "border-primary/30 bg-primary-soft text-primary hover:border-primary"
                      )}
                    >
                      {used ? <Check size={14} aria-hidden /> : <Plus size={14} aria-hidden />}
                      {sentence}
                    </button>
                  );
                })}
              </div>
              <textarea
                id={f.key}
                rows={3}
                value={narrative[f.key]}
                onChange={(e) => editNarrative(f.key, e.target.value)}
                className={inputClass}
              />
            </div>
          ))}
        </section>

        <section className={cn(card, "p-5")}>
          {published ? (
            <>
              <p className="flex items-center gap-2 font-bold text-hadir">
                <Check size={20} aria-hidden /> Rapor sudah terbit
              </p>
              <p className="mt-1 text-sm text-muted">Perubahan nilai setelah terbit langsung terlihat oleh ortu.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={waLink(shareText, player.parentPhoneWa)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-white hover:bg-primary-dark"
                >
                  <Send size={18} aria-hidden /> {player.parentPhoneWa ? "Kirim ke WA ortu" : "Kirim lewat WA"}
                </a>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-card px-4 font-semibold hover:bg-ground"
                >
                  <Eye size={18} aria-hidden /> Lihat rapor
                </a>
                <Button variant="ghost" onClick={() => publish(false)} loading={publishing}>
                  <Undo2 size={18} aria-hidden /> Tarik kembali
                </Button>
              </div>
            </>
          ) : (
            <Button size="lg" className="w-full" onClick={() => publish(true)} loading={publishing}>
              <Check size={20} aria-hidden /> Terbitkan rapor {player.fullName}
            </Button>
          )}
          {nav.nextId && (
            <Link
              href={`/rapor/${period.id}/${nav.nextId}`}
              className="mt-3 flex min-h-12 items-center justify-center gap-1 font-bold text-primary"
            >
              Anak berikutnya <ChevronRight size={18} aria-hidden />
            </Link>
          )}
        </section>
      </div>
    </div>
  );
}

function RosterPill({ status, avg }: { status: RosterRow["status"]; avg: number }) {
  const base = "shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold";
  if (status === "published")
    return (
      <span className={cn(base, "border-primary/30 bg-primary-soft text-primary")}>
        {avg.toFixed(1)} <Star size={9} className="inline fill-current" aria-hidden />
      </span>
    );
  if (status === "draft") return <span className={cn(base, "border-izin/30 bg-izin/10 text-izin")}>Draf</span>;
  return <span className={cn(base, "border-line bg-ground text-muted")}>Belum</span>;
}

function NavButton({ href, label, children }: { href: string | null; label: string; children: React.ReactNode }) {
  const cls = "grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-subtle hover:bg-ground";
  return href ? (
    <Link href={href} aria-label={label} className={cls}>
      {children}
    </Link>
  ) : (
    <span aria-hidden className={cn(cls, "opacity-30")}>
      {children}
    </span>
  );
}

function SaveState({ inflight, failed }: { inflight: number; failed: boolean }) {
  if (inflight > 0)
    return (
      <p className="inline-flex items-center gap-1 rounded-full border border-line bg-subtle px-2.5 py-0.5 text-[11px] font-bold text-muted">
        <Spinner size={11} /> Menyimpan…
      </p>
    );
  if (failed) return <p className="rounded-full border border-alpa/30 bg-alpa/10 px-2.5 py-0.5 text-[11px] font-bold text-alpa">Gagal menyimpan</p>;
  return (
    <p className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary-soft px-2.5 py-0.5 text-[11px] font-bold text-primary">
      <Check size={12} aria-hidden /> Tersimpan otomatis
    </p>
  );
}
