import { ArrowRight, MessageCircle } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { cn, waLink } from "@/lib/utils";

// Nomor pemilik produk (digit, mis. 628…). Kosong → tombol WA diganti ajakan masuk, tanpa link WA yang rusak.
const PHONE = (process.env.NEXT_PUBLIC_CONTACT_WA ?? "").replace(/\D/g, "");
const WA_TEXT = "Halo, saya tertarik mencoba TalentaBola untuk SSB kami.";

const pill = "rounded-full px-7";

/** Aksi utama + sekunder. `onDark` untuk kartu gelap (tombol sekunder berwarna terang). */
export function Cta({ onDark, className }: { onDark?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row", className)}>
      {PHONE ? (
        <>
          <a href={waLink(WA_TEXT, PHONE)} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "lg", pill)}>
            <MessageCircle size={18} aria-hidden />
            Hubungi kami
          </a>
          <Link
            href="/masuk"
            className={buttonClass("outline", "lg", cn(pill, onDark && "border-white/25 bg-white/10 text-white hover:bg-white/20"))}
          >
            Masuk pelatih
          </Link>
        </>
      ) : (
        <Link href="/masuk" className={buttonClass("primary", "lg", pill)}>
          Masuk pelatih
          <ArrowRight size={18} aria-hidden />
        </Link>
      )}
    </div>
  );
}

export const waHref = PHONE ? waLink(WA_TEXT, PHONE) : null;
