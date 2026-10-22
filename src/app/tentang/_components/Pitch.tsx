// Formasi 1-2-3-1 (Filanesia KU-10) — motif yang sama dengan panel halaman /masuk; nomor saja, tanpa nama anak.
const LINEUP: [number, number, number][] = [
  [200, 525, 1], [125, 425, 4], [275, 425, 5], [85, 305, 7], [200, 330, 10], [315, 305, 11], [200, 205, 9],
];
const LINKS: [number, number][] = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5], [4, 6], [3, 6], [5, 6]];

/** Lapangan + formasi; warna ikut `currentColor`, atur lewat className (warna + opacity). */
export function Pitch({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 600" className={className} aria-hidden preserveAspectRatio="xMidYMid meet">
      <g fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="3">
        <rect x="30" y="30" width="340" height="540" rx="6" />
        <line x1="30" y1="300" x2="370" y2="300" />
        <circle cx="200" cy="300" r="56" />
        <rect x="110" y="30" width="180" height="84" />
        <rect x="110" y="486" width="180" height="84" />
      </g>
      <g stroke="currentColor" strokeOpacity="0.6" strokeWidth="2" strokeDasharray="5 7" fill="none">
        {LINKS.map(([a, b]) => (
          <line key={`${a}-${b}`} x1={LINEUP[a]![0]} y1={LINEUP[a]![1]} x2={LINEUP[b]![0]} y2={LINEUP[b]![1]} />
        ))}
      </g>
      {LINEUP.map(([x, y, n]) => (
        <g key={n} transform={`translate(${x} ${y})`}>
          <path
            d="M-14 -18 L-6 -22 Q0 -16 6 -22 L14 -18 L24 -8 L16 -1 L13 -5 L13 21 L-13 21 L-13 -5 L-16 -1 L-24 -8 Z"
            fill="currentColor"
          />
          <text y="12" textAnchor="middle" className="text-[17px] font-black" fill="var(--color-ground)">
            {n}
          </text>
        </g>
      ))}
    </svg>
  );
}
