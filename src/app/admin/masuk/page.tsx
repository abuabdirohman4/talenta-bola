import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/app/masuk/_components/LoginForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { isAdmin } from "@/lib/auth/require-user";
import { signInAdmin } from "./actions";

export const metadata: Metadata = { title: "Super-admin", robots: { index: false } };

export default async function AdminMasukPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <main className="relative grid min-h-dvh place-items-center px-4 py-10">
      <ThemeToggle className="absolute top-4 right-4" />
      <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-6 shadow-sm">
        <p className="eyebrow">TalentaBola</p>
        <h1 className="text-xl font-black tracking-tight">Masuk super-admin</h1>
        <p className="mt-2 text-sm text-muted">Khusus pemilik produk. Pelatih masuk lewat halaman Masuk biasa.</p>
        <LoginForm action={signInAdmin} />
      </div>
    </main>
  );
}
