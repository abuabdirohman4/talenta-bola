const TZ = "Asia/Jakarta";

/** Tanggal (default hari ini) menurut WIB, format YYYY-MM-DD. */
export function dateWib(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
}

/** "2026-09-21" → "Minggu, 21 Sep 2026". Kolom `date` tanpa zona, jadi dibaca sebagai UTC. */
export function formatDateId(isoDate: string, opts: { weekday?: boolean } = { weekday: true }): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    weekday: opts.weekday ? "long" : undefined,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(isoDate + "T00:00:00Z"));
}

/** "07:30" → "07.30" (gaya penulisan jam Indonesia). */
export function formatTimeId(time: string): string {
  return time.slice(0, 5).replace(":", ".");
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function initials(name: string): string {
  return name
    .replace(/[^\p{L}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** Inisial logo klub: "SSB Galuh Putra" → "GP" (awalan SSB tidak ikut). */
export const clubInitials = (name: string) => initials(name.replace(/^SSB\s+/i, ""));
