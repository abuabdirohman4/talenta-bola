"use client";

import { AlertCircle, Check, ChevronLeft, ChevronRight, Eye, Plus, Send, Star, Undo2 } from "lucide-react";
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

export function ReportForm({ period, player, nav, attendance, initial, baseUrl, ssbName }: Props) {
  const ref = { periodId: period.id, playerId: player.id };
  const [scores, setScores] = useState(initial.scores);
  const [narrative, setNarrative] = useState(initial.narrative);
  const [inflight, setInflight] = useState(0);
  const [failed, setFailed] = useState(false);
  const [published, setPub] = useState(!!initial.publishedAt);
  const [token, setToken] = useState(initial.publicToken);
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

  return (
    <div className="-mx-4 lg:mx-0">
      {/* Navigasi antar anak tanpa balik ke daftar. */}
      <div className="sticky top-[61px] z-20 flex items-center gap-2 border-b border-line bg-card/95 px-2 py-2 backdrop-blur lg:top-0 lg:rounded-2xl lg:border">
        <NavButton href={nav.prevId && `/rapor/${period.id}/${nav.prevId}`} label="Anak sebelumnya">
          <ChevronLeft />
        </NavButton>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-sm font-bold">
            Anak {nav.index + 1} dari {nav.total}
          </p>
          <SaveState inflight={inflight} failed={failed} />
        </div>
        <NavButton href={nav.nextId && `/rapor/${period.id}/${nav.nextId}`} label="Anak berikutnya">
          <ChevronRight />
        </NavButton>
      </div>

      <div className="space-y-4 px-4 pt-4 lg:px-0">
        <section className="flex items-center gap-4 rounded-2xl border border-line bg-card p-4">
          <Avatar name={player.fullName} photoUrl={player.photoUrl} className="size-16 text-xl" />
          <div className="min-w-0">
            <h2 className="truncate text-xl font-extrabold">
              {player.fullName}
              {player.jerseyNumber ? <span className="text-muted"> #{player.jerseyNumber}</span> : null}
            </h2>
            <p className="text-[15px] text-muted">
              {player.position ?? "Posisi belum diisi"} ·{" "}
              {attendance.held ? `Hadir ${attendance.hadir}/${attendance.held} sesi (${attendance.rate}%)` : "Belum ada sesi di periode ini"}
            </p>
            <p className="text-sm text-muted">{period.name}</p>
          </div>
        </section>

        <p className="flex items-start gap-2 rounded-xl bg-primary-soft p-3 text-[15px] text-ink">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden />
          Semua aspek mulai dari 3 bintang (Cukup). Ubah yang menonjol saja — yang belum disentuh tampak pudar.
        </p>

        {RUBRIC.map((g) => (
          <section key={g.key} className="rounded-2xl border border-line bg-card">
            <header className="flex items-center justify-between border-b border-line px-4 py-3">
              <h3 className="font-bold">{g.label}</h3>
              <span className="text-sm font-semibold text-muted">Rata-rata {groupAverage(g, scores).toFixed(1)}</span>
            </header>
            <ul className="divide-y divide-line">
              {g.aspects.map((a) => {
                const touched = scores[a.key] !== undefined;
                const value = scores[a.key] ?? DEFAULT_SCORE;
                return (
                  <li key={a.key} className="px-4 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{a.label}</span>
                      <span className={cn("text-sm", touched ? "font-semibold text-ink" : "text-muted")}>{SCORE_LABEL[value]}</span>
                    </div>
                    <div className={cn("mt-1 flex gap-1", !touched && "opacity-45")} role="radiogroup" aria-label={a.label}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          role="radio"
                          aria-checked={value === n}
                          aria-label={`${n} bintang — ${SCORE_LABEL[n]}`}
                          onClick={() => rate(a.key, n)}
                          className="grid size-11 place-items-center rounded-lg active:scale-90"
                        >
                          <Star
                            size={30}
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

        <section className="space-y-5 rounded-2xl border border-line bg-card p-4">
          <div>
            <h3 className="font-bold">Evaluasi pelatih</h3>
            <p className="text-sm text-muted">Bagian ini yang paling dibaca ortu. Sentuh kalimat untuk menambahkan, lalu sesuaikan.</p>
          </div>
          {NARRATIVE_FIELDS.map((f) => (
            <div key={f.key}>
              <label htmlFor={f.key} className="mb-1.5 block font-semibold">
                {f.label}
              </label>
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
                        "inline-flex min-h-9 items-center gap-1 rounded-full border px-3 py-1 text-left text-sm",
                        used ? "border-primary/30 bg-primary-soft text-primary" : "border-line bg-ground hover:border-primary"
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

        <section className="rounded-2xl border border-line bg-card p-4">
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
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-white"
                >
                  <Send size={18} aria-hidden /> {player.parentPhoneWa ? "Kirim ke WA ortu" : "Kirim lewat WA"}
                </a>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 font-semibold"
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
              className="mt-3 flex min-h-12 items-center justify-center gap-1 font-semibold text-primary"
            >
              Anak berikutnya <ChevronRight size={18} aria-hidden />
            </Link>
          )}
        </section>
      </div>
    </div>
  );
}

function NavButton({ href, label, children }: { href: string | null; label: string; children: React.ReactNode }) {
  const cls = "grid size-12 place-items-center rounded-xl border border-line bg-card";
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
      <p className="inline-flex items-center gap-1 text-xs text-muted">
        <Spinner size={11} /> Menyimpan…
      </p>
    );
  if (failed) return <p className="text-xs font-semibold text-alpa">Gagal menyimpan</p>;
  return (
    <p className="inline-flex items-center gap-1 text-xs font-semibold text-hadir">
      <Check size={12} aria-hidden /> Tersimpan otomatis
    </p>
  );
}
