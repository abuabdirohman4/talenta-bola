import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { players } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { getSsb } from "@/lib/data";

const UUID = /^[0-9a-f-]{36}$/i;

/** Foto pemain sebagai gambar biasa, supaya daftar tidak menyelipkan puluhan data URL ke HTML. URL memuat ?v=<updatedAt>, jadi aman di-cache lama. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
  } catch {
    return new Response(null, { status: 401 });
  }
  const { id } = await params;
  if (!UUID.test(id)) return new Response(null, { status: 404 });
  const ssb = await getSsb();
  const [p] = await db
    .select({ photoUrl: players.photoUrl })
    .from(players)
    .where(and(eq(players.id, id), eq(players.ssbId, ssb.id), isNull(players.deletedAt)));
  const m = p?.photoUrl?.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!m) return new Response(null, { status: 404 });
  return new Response(Buffer.from(m[2], "base64"), {
    headers: { "Content-Type": m[1], "Cache-Control": "private, max-age=31536000, immutable" },
  });
}
