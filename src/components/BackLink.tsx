import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mb-2 inline-flex min-h-11 items-center gap-1 text-[15px] font-semibold text-muted">
      <ArrowLeft size={18} aria-hidden /> {children}
    </Link>
  );
}
