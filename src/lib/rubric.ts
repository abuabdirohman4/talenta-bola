// Rubrik rapor yang disetujui pelatih KU 2016 (Sep 2026) — jangan diubah tanpa persetujuan pelatih.
// Skor disimpan per baris (report_scores.aspect_key), jadi aspek boleh bertambah tanpa ubah tabel.

export type AspectGroup = { key: string; label: string; aspects: { key: string; label: string }[] };

export const RUBRIC: AspectGroup[] = [
  {
    key: "teknik",
    label: "Teknik",
    aspects: [
      { key: "ball_mastery", label: "Ball mastery" },
      { key: "dribbling", label: "Dribbling" },
      { key: "passing", label: "Passing" },
      { key: "first_touch", label: "Kontrol / first touch" },
      { key: "shooting", label: "Shooting" },
      { key: "finishing", label: "Finishing" },
      { key: "one_v_one", label: "1 vs 1" },
    ],
  },
  {
    key: "taktik",
    label: "Taktik & pemahaman permainan",
    aspects: [
      { key: "posisi", label: "Posisi" },
      { key: "attacking", label: "Attacking" },
      { key: "defending", label: "Defending" },
      { key: "decision_making", label: "Decision making" },
      { key: "kerja_sama", label: "Kerja sama tim" },
      { key: "pemahaman_ruang", label: "Pemahaman ruang" },
    ],
  },
  {
    key: "fisik_mental",
    label: "Fisik & mental",
    aspects: [
      { key: "kecepatan", label: "Kecepatan" },
      { key: "kelincahan", label: "Kelincahan" },
      { key: "stamina", label: "Stamina" },
      { key: "koordinasi", label: "Koordinasi" },
      { key: "percaya_diri", label: "Percaya diri" },
      { key: "konsentrasi", label: "Konsentrasi" },
      { key: "keberanian_duel", label: "Keberanian duel" },
      { key: "disiplin", label: "Disiplin" },
      { key: "sikap", label: "Sikap terhadap pelatih & teman" },
    ],
  },
];

export const ASPECT_KEYS = new Set(RUBRIC.flatMap((g) => g.aspects.map((a) => a.key)));
export const DEFAULT_SCORE = 3;

export const SCORE_LABEL: Record<number, string> = {
  1: "Perlu banyak latihan",
  2: "Berkembang",
  3: "Cukup",
  4: "Baik",
  5: "Sangat baik",
};

export const NARRATIVE_FIELDS = [
  {
    key: "strengths",
    label: "Kelebihan pemain",
    bank: [
      "Memiliki keberanian membawa bola dan cukup baik dalam melakukan passing pendek.",
      "Semangat latihan tinggi dan selalu datang tepat waktu.",
      "Mampu membaca arah bola dan cepat kembali bertahan.",
      "Tenang saat menguasai bola dan berani meminta bola.",
      "Mau bekerja sama dan sering memberi umpan ke teman.",
    ],
  },
  {
    key: "improvements",
    label: "Yang perlu ditingkatkan",
    bank: [
      "First touch dan pengambilan keputusan ketika berada di bawah tekanan.",
      "Penggunaan kaki yang lebih lemah saat passing dan menembak.",
      "Komunikasi dengan teman saat bertahan.",
      "Konsentrasi menjaga posisi sepanjang permainan.",
      "Stamina agar tetap kuat sampai akhir latihan.",
    ],
  },
  {
    key: "nextTarget",
    label: "Target periode berikutnya",
    bank: [
      "Meningkatkan kontrol bola dan kemampuan bermain 1 vs 1.",
      "Lebih berani menembak dari luar kotak penalti.",
      "Konsisten menjaga posisi saat tim kehilangan bola.",
      "Mampu passing akurat dengan dua kaki.",
    ],
  },
  {
    key: "homeTraining",
    label: "Latihan mandiri di rumah",
    bank: [
      "Ball mastery 15 menit, 3 kali seminggu.",
      "Juggling bola, target bertambah 5 kali tiap minggu.",
      "Passing ke tembok dengan kaki kiri dan kanan, 10 menit sehari.",
      "Lari zig-zag melewati botol atau sandal, 10 menit.",
    ],
  },
] as const;

export type NarrativeKey = (typeof NARRATIVE_FIELDS)[number]["key"];
export const NARRATIVE_KEYS = new Set<string>(NARRATIVE_FIELDS.map((f) => f.key));

/** Rata-rata skor satu kelompok aspek; aspek yang belum diubah pelatih dihitung nilai default. */
export function groupAverage(group: AspectGroup, scores: Record<string, number>): number {
  const sum = group.aspects.reduce((s, a) => s + (scores[a.key] ?? DEFAULT_SCORE), 0);
  return Math.round((sum / group.aspects.length) * 10) / 10;
}
