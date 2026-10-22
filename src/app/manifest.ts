import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TalentaBola",
    short_name: "TalentaBola",
    description: "Presensi lapangan satu tap dan rapor perkembangan pemain untuk Sekolah Sepak Bola.",
    start_url: "/",
    display: "standalone",
    background_color: "#f1f5f9",
    theme_color: "#059669",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
