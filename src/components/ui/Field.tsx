import { cn } from "@/lib/utils";

export const inputClass =
  "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-base text-ink placeholder:text-muted/70 " +
  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60";

type FieldProps = {
  label: string;
  error?: string;
  warning?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

/** Label + kontrol + pesan. Error = merah (blokir simpan), warning = kuning (tetap boleh simpan). */
export function Field({ label, error, warning, hint, required, className, children }: FieldProps) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
        {required && <span className="text-alpa"> *</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-sm text-alpa">{error}</span>
      ) : warning ? (
        <span className="mt-1 block text-sm text-warn">{warning}</span>
      ) : hint ? (
        <span className="mt-1 block text-sm text-muted">{hint}</span>
      ) : null}
    </label>
  );
}
