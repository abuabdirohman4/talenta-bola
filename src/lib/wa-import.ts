export type ParsedName = { fullName: string; nickname: string | null };

// Kata status yang ikut ditulis ortu di daftar WA ("7. Shiraj ❎ ijin").
const STATUS_WORDS = /\b(hadir|ijin|izin|sakit|alpa|alpha|absen|libur)\b/gi;
// Baris instruksi, bukan nama ("42. Tulis yang belum ketulis").
const INSTRUCTION = /^(tulis|silakan|silahkan|lanjut|yang belum|daftar)\b/i;
const NUMBERED = /^\s*\d{1,3}\s*[.)\-:]\s*/;

/** Ubah daftar presensi WA (bernomor, campur emoji & status) jadi daftar nama unik. */
export function parseWaList(text: string): ParsedName[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const hasNumbered = lines.some((l) => NUMBERED.test(l));
  const seen = new Set<string>();
  const out: ParsedName[] = [];

  for (const line of lines) {
    if (hasNumbered && !NUMBERED.test(line)) continue; // judul seperti "Daftar siswa KU 2016"
    const name = line
      .replace(NUMBERED, "")
      .replace(/\(.*?\)/g, " ")
      .replace(/[^\p{L}\p{N}\s.'/-]/gu, " ") // emoji & simbol
      .replace(STATUS_WORDS, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^[-.\s]+|[-.\s/]+$/g, "");
    if (!name || INSTRUCTION.test(name) || name.split(" ").length > 5) continue;

    const [full, nick] = name.split("/").map((s) => s.trim());
    if (!full) continue;
    const key = full.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ fullName: full, nickname: nick || null });
  }
  return out;
}
