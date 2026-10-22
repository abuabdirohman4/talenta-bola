import Image from "next/image";
import { cn } from "@/lib/utils";

/** Bingkai HP berisi screenshot demo (780×1688). */
export function Phone({ src, alt, priority, className }: { src: string; alt: string; priority?: boolean; className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[250px] rounded-[2.25rem] border-[7px] border-hero bg-hero shadow-2xl shadow-primary/20 ring-1 ring-line",
        className
      )}
    >
      <Image src={src} alt={alt} width={780} height={1688} sizes="250px" priority={priority} className="h-auto w-full rounded-[1.7rem]" />
    </div>
  );
}
