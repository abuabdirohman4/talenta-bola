import { CHART, trendPoints } from "@/lib/dashboard";
import { formatDateId } from "@/lib/format";

/** Garis persen hadir per sesi; SVG murni, tooltip lewat <title>. */
export function TrendChart({ sessions }: { sessions: { date: string; pct: number }[] }) {
  if (!sessions.length) {
    return <p className="rounded-xl bg-subtle p-4 text-sm text-muted">Grafik muncul setelah ada sesi yang diisi.</p>;
  }
  const { w, h, l, r, t, b } = CHART;
  const pts = trendPoints(sessions);
  const y = (v: number) => t + (1 - v / 100) * (h - t - b);
  const step = Math.ceil(pts.length / 6);
  const short = (d: string) => `${+d.slice(8, 10)}/${+d.slice(5, 7)}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Tren kehadiran per sesi">
      {[0, 50, 80, 100].map((v) => (
        <g key={v}>
          <line x1={l} x2={w - r} y1={y(v)} y2={y(v)} className="stroke-line" strokeWidth={1} strokeDasharray={v === 50 || v === 80 ? "4 4" : undefined} />
          <text x={l - 6} y={y(v) + 3} textAnchor="end" className="fill-muted" fontSize={10}>{v}</text>
        </g>
      ))}
      {pts.length > 1 && (
        <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" className="stroke-primary" strokeWidth={2} strokeLinejoin="round" />
      )}
      {pts.map((p, i) => (
        <g key={p.date + i}>
          <circle cx={p.x} cy={p.y} r={4} className="fill-primary stroke-card" strokeWidth={2}>
            <title>{`${formatDateId(p.date)}: ${p.pct}% hadir`}</title>
          </circle>
          {i % step === 0 && (
            <text x={p.x} y={h - 10} textAnchor="middle" className="fill-muted" fontSize={10}>{short(p.date)}</text>
          )}
        </g>
      ))}
    </svg>
  );
}
