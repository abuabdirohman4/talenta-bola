import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: { default: "TalentaBola", template: "%s · TalentaBola" },
  description: "Presensi lapangan satu tap dan rapor perkembangan pemain untuk Sekolah Sepak Bola.",
  applicationName: "TalentaBola",
  // Data anak di bawah umur — jangan sampai diindeks mesin pencari, termasuk link ortu/rapor.
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "TalentaBola", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
};

const THEME_SCRIPT = `try{var c=localStorage.getItem("tb-sidebar-collapsed");if(c==="1"||(c===null&&innerWidth<1024))document.documentElement.dataset.sb="collapsed"}catch(e){}try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable} suppressHydrationWarning>
      <head>
        {/* Sebelum cat pertama supaya tidak berkedip terang → gelap. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        {children}
        <Toaster position="top-center" richColors closeButton />
        <PwaRegister />
      </body>
    </html>
  );
}
