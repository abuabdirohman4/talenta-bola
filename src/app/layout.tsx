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
  themeColor: "#2f6b3f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body className="min-h-dvh font-sans antialiased">
        {children}
        <Toaster position="top-center" richColors closeButton />
        <PwaRegister />
      </body>
    </html>
  );
}
