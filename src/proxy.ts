import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, SESSION_COOKIE, verifyAdminValue, verifySessionValue } from "@/lib/auth/session";

// Proxy hanya mengalihkan halaman (cek tanda tangan cookie, tanpa DB) — penjaga data tetap requireUser()/requireAdmin()
// di tiap action/route, yang juga mengecek SSB terhapus & versi kode.
// Tamu di "/" melihat halaman produk (/tentang) tanpa ganti URL; pelatih ber-sesi tetap ke beranda.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const go = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = "";
    return NextResponse.redirect(url);
  };

  // Super-admin: cookie sendiri; sesi pelatih tidak berlaku di sini.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (pathname === "/admin/masuk" || verifyAdminValue(request.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.next();
    return go("/admin/masuk");
  }

  if (verifySessionValue(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  if (pathname === "/") return NextResponse.rewrite(new URL("/tentang", request.url));
  return go("/masuk");
}

export const config = {
  // Halaman publik: masuk, halaman produk (/tentang + /landing/ aset), link ortu (/ortu/<token>), rapor bagikan (/r/<token>), aset & PWA.
  // /admin ikut lewat proxy (termasuk /admin/masuk, yang dilepas di atas).
  matcher: [
    "/((?!masuk|tentang|landing/|ortu/|r/|api/|_next/|icons/|sw\\.js|manifest\\.webmanifest|icon\\.png|apple-icon\\.png|favicon\\.ico|robots\\.txt).*)",
  ],
};
