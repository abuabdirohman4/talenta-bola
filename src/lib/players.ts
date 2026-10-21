export const POSITIONS = [
  { value: "GK", label: "Kiper" },
  { value: "DF", label: "Bek" },
  { value: "MF", label: "Gelandang" },
  { value: "FW", label: "Penyerang" },
] as const;

export const FEET = [
  { value: "RIGHT", label: "Kanan" },
  { value: "LEFT", label: "Kiri" },
  { value: "BOTH", label: "Dua kaki" },
] as const;

export const positionLabel = (v: string | null) => POSITIONS.find((p) => p.value === v)?.label ?? null;
export const footLabel = (v: string | null) => FEET.find((f) => f.value === v)?.label ?? null;

/** Data minimal yang dibutuhkan rapor & link ortu. */
export function missingFields(p: { birthDate: string | null; parentPhoneWa: string | null; position: string | null }) {
  return [!p.birthDate && "tgl lahir", !p.parentPhoneWa && "WA ortu", !p.position && "posisi"].filter(
    Boolean
  ) as string[];
}

export type PlayerFormData = {
  id?: string;
  ageGroupId: string;
  fullName: string;
  nickname: string;
  birthDate: string;
  jerseyNumber: string;
  position: string;
  preferredFoot: string;
  heightCm: string;
  weightKg: string;
  parentName: string;
  parentPhoneWa: string;
  photoUrl: string;
  isActive: boolean;
};

/** "" → null, "36,5" → 36.5 (koma desimal ala Indonesia). */
export const toNum = (s: string) => {
  const t = s.trim().replace(",", ".");
  return t === "" ? null : Number(t);
};
