import { radarPoint } from "@/lib/dashboard";

/** Radar skala 1–5; nilai 1 di cincin dalam. SVG murni. */
export function RadarChart({ axes }: { axes: { label: string; avg: number }[] }) {
  const cx = 150, cy = 130, R = 90, max = 5, n = axes.length;
  const poly = (v: (i: number) => number) =>
    axes.map((_, i) => { const p = radarPoint(i, n, v(i), max, cx, cy, R); return `${p.x},${p.y}`; }).join(" ");
  return (
    <svg viewBox="0 0 300 260" className="mx-auto w-full max-w-xs" role="img" aria-label="Profil kemampuan tim">
      {[1, 2, 3, 4, 5].map((lv) => (
        <polygon key={lv} points={poly(() => lv)} fill="none" className="stroke-line" strokeWidth={1} />
      ))}
      {axes.map((_, i) => {
        const p = radarPoint(i, n, max, max, cx, cy, R);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} className="stroke-line" strokeWidth={1} />;
      })}
      <polygon points={poly((i) => axes[i].avg)} className="fill-primary/20 stroke-primary" strokeWidth={2} strokeLinejoin="round" />
      {axes.map((a, i) => {
        const dot = radarPoint(i, n, a.avg, max, cx, cy, R);
        const lab = radarPoint(i, n, max + 0.75, max, cx, cy, R);
        return (
          <g key={a.label}>
            <circle cx={dot.x} cy={dot.y} r={3.5} className="fill-primary">
              <title>{`${a.label}: ${a.avg.toFixed(1)} / 5`}</title>
            </circle>
            <text x={lab.x} y={lab.y + 4} textAnchor="middle" className="fill-ink" fontSize={11} fontWeight={700}>
              {a.label} {a.avg.toFixed(1)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
