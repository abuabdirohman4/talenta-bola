export type PlayerInput = {
  fullName?: string;
  birthDate?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  jerseyNumber?: number | null;
  parentPhoneWa?: string | null;
  ageGroupBirthYear?: number | null;
};

export type ValidationResult = {
  ok: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
};

// Batas wajar anak usia 6-18 tahun.
const HEIGHT_MIN = 90;
const HEIGHT_MAX = 200;
const WEIGHT_MIN = 15;
const WEIGHT_MAX = 120;

/** 0812-3456-789 / +62 812… / 62812… → 628123456789; null kalau bukan nomor HP Indonesia. */
export function normalizePhoneWa(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return /^628\d{7,11}$/.test(d) ? d : null;
}

export function validatePlayer(input: PlayerInput): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  if (!input.fullName?.trim()) errors.fullName = "Nama wajib diisi";
  else if (input.fullName.trim().length > 80) errors.fullName = "Nama terlalu panjang";

  const h = input.heightCm ?? null;
  const w = input.weightKg ?? null;

  if (h !== null && (Number.isNaN(h) || h < HEIGHT_MIN || h > HEIGHT_MAX)) {
    errors.heightCm = `Tinggi harus antara ${HEIGHT_MIN}-${HEIGHT_MAX} cm`;
  }
  if (w !== null && (Number.isNaN(w) || w < WEIGHT_MIN || w > WEIGHT_MAX)) {
    errors.weightKg = `Berat harus antara ${WEIGHT_MIN}-${WEIGHT_MAX} kg`;
  }

  // BMI kasar menangkap kombinasi mustahil yang lolos batas tunggal, mis. 144 cm / 15 kg (BMI 7,2).
  if (h !== null && w !== null && !errors.heightCm && !errors.weightKg) {
    const bmi = w / Math.pow(h / 100, 2);
    if (bmi < 10 || bmi > 35) {
      errors.weightKg = `Kombinasi tinggi ${h} cm dan berat ${w} kg tidak wajar — mohon dicek ulang`;
    }
  }

  const j = input.jerseyNumber ?? null;
  if (j !== null && (!Number.isInteger(j) || j < 1 || j > 99)) {
    errors.jerseyNumber = "Nomor punggung 1-99";
  }

  if (input.parentPhoneWa?.trim() && !normalizePhoneWa(input.parentPhoneWa)) {
    errors.parentPhoneWa = "Nomor WA tidak valid (contoh: 0812 3456 7890)";
  }

  if (input.birthDate) {
    const d = new Date(input.birthDate);
    const y = d.getUTCFullYear();
    if (Number.isNaN(y) || y < 2000 || d > new Date()) {
      errors.birthDate = "Tanggal lahir tidak valid";
    } else if (input.ageGroupBirthYear && y !== input.ageGroupBirthYear) {
      // Warning, bukan error: anak boleh ikut KU di atas umurnya.
      warnings.birthDate = `Tahun lahir ${y} tidak cocok dengan kelompok umur (${input.ageGroupBirthYear})`;
    }
  }

  return { ok: Object.keys(errors).length === 0, errors, warnings };
}
