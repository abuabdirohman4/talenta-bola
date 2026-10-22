import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionValue } from "@/lib/auth/session";

// Proxy hanya mengalihkan halaman ke /masuk — penjaga data tetap requireUser() di tiap action/route.
// Tamu di "/" melihat halaman produk (/tentang) tanpa ganti URL; pelatih ber-sesi tetap ke beranda.
export function proxy(request: NextRequest) {
  if (verifySessionValue(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  if (request.nextUrl.pathname === "/") return NextResponse.rewrite(new URL("/tentang", request.url));
  const url = request.nextUrl.clone();
  url.pathname = "/masuk";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Halaman publik: masuk, halaman produk (/tentang + /landing/ aset), link ortu (/ortu/<token>), rapor bagikan (/r/<token>), aset & PWA.
  matcher: [
    "/((?!masuk|tentang|landing/|ortu/|r/|api/|_next/|icons/|sw\\.js|manifest\\.webmanifest|icon\\.png|apple-icon\\.png|favicon\\.ico|robots\\.txt).*)",
  ],
};
