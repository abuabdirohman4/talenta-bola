import { cn } from "@/lib/utils";
import { Spinner } from "./Spinner";

type Variant = "primary" | "outline" | "ghost" | "danger";
const VARIANT: Record<Variant, string> = {
  primary: "bg-primary text-white border-transparent hover:bg-primary-dark",
  outline: "bg-card text-ink border-line hover:bg-ground",
  ghost: "bg-transparent text-ink border-transparent hover:bg-black/5",
  danger: "bg-alpa text-white border-transparent hover:brightness-90",
};
const SIZE = {
  md: "min-h-11 px-4 text-[15px]",
  lg: "min-h-14 px-5 text-base",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: keyof typeof SIZE;
  loading?: boolean;
};

export function buttonClass(variant: Variant = "primary", size: keyof typeof SIZE = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl border font-semibold transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    VARIANT[variant],
    SIZE[size],
    className
  );
}

export function Button({ variant, size, loading, disabled, className, children, ...rest }: ButtonProps) {
  return (
    <button
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
