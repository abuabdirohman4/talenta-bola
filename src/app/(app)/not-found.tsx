import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="rounded-2xl border border-line bg-card p-6 text-center">
      <h2 className="text-xl font-bold">Halaman tidak ditemukan</h2>
      <p className="mt-2 text-muted">Data mungkin sudah dihapus, atau link-nya salah ketik.</p>
      <Link href="/" className={buttonClass("primary", "md", "mt-5")}>
        Kembali ke beranda
      </Link>
    </div>
  );
}
