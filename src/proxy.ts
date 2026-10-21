import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionValue } from "@/lib/auth/session";

// Proxy hanya mengalihkan halaman ke /masuk — penjaga data tetap requireUser() di tiap action/route.
export function proxy(request: NextRequest) {
  if (verifySessionValue(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/masuk";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Halaman publik: masuk, link ortu (/ortu/<token>), rapor bagikan (/r/<token>), aset & PWA.
  matcher: [
    "/((?!masuk|ortu/|r/|api/|_next/|icons/|sw\\.js|manifest\\.webmanifest|icon\\.png|apple-icon\\.png|favicon\\.ico|robots\\.txt).*)",
  ],
};
