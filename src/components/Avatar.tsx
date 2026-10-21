import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Avatar({ name, photoUrl, className }: { name: string; photoUrl: string | null; className?: string }) {
  return photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photoUrl} alt="" className={cn("size-11 shrink-0 rounded-full object-cover", className)} />
  ) : (
    <span
      aria-hidden
      className={cn("grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft font-bold text-primary", className)}
    >
      {initials(name)}
    </span>
  );
}
