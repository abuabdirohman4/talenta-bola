"use server";

import { and, eq, gte, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { parentPermissions, players, ssbProfiles, trainingSessions } from "@/db/schema";
import { addDays, dateWib } from "@/lib/format";
import { permissionNotice } from "@/lib/notif-format";
import { notifySsb } from "@/lib/server/notify";

// Pintu publik (tercatat di PUBLIC guard.test.ts): penjaganya token acak per anak, bukan sesi login.
export async function submitPermission(input: {
  token: string;
  sessionId: string;
  type: string;
  reason: string;
}): Promise<{ ok?: true; error?: string }> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(input.token)) return { error: "Link tidak valid" };
  const [player] = await db
    .select({ id: players.id, ssbId: players.ssbId, ageGroupId: players.ageGroupId, fullName: players.fullName, nickname: players.nickname })
    .from(players)
    .innerJoin(ssbProfiles, eq(ssbProfiles.id, players.ssbId))
    .where(and(eq(players.parentToken, input.token), isNull(players.deletedAt), isNull(ssbProfiles.deletedAt)));
  if (!player) return { error: "Link sudah tidak berlaku. Minta link baru ke pelatih." };

  if (input.type !== "IZIN" && input.type !== "SAKIT") return { error: "Pilih Izin atau Sakit" };
  const reason = input.reason.trim();
  if (reason.length < 3) return { error: "Tulis alasan singkat (mis. demam, acara keluarga)" };

  // Izin hanya untuk sesi yang benar-benar ada, belum lewat, dan tidak libur.
  const today = dateWib();
  const [session] = await db
    .select({ id: trainingSessions.id, date: trainingSessions.sessionDate, status: trainingSessions.status })
    .from(trainingSessions)
    .where(
      and(
        eq(trainingSessions.id, input.sessionId),
        eq(trainingSessions.ageGroupId, player.ageGroupId),
        isNull(trainingSessions.deletedAt),
        gte(trainingSessions.sessionDate, today)
      )
    );
  if (!session) return { error: "Tidak ada latihan terjadwal di tanggal itu. Hubungi pelatih bila perlu." };
  if (session.status === "CANCELLED") return { error: "Latihan tanggal itu sudah diliburkan — tidak perlu izin." };
  if (session.date > addDays(today, 30)) return { error: "Izin paling jauh 30 hari ke depan." };

  // Izin ganda: semuanya disimpan sebagai riwayat, yang terbaru dipakai di lembar pelatih.
  const [perm] = await db
    .insert(parentPermissions)
    .values({ ssbId: player.ssbId, playerId: player.id, sessionId: session.id, type: input.type, reason: reason.slice(0, 200) })
    .returning({ id: parentPermissions.id });
  // notifySsb tidak pernah throw, jadi izin ortu tetap tersimpan walau notifikasi gagal.
  await notifySsb(player.ssbId, {
    kind: "izin_ortu",
    ...permissionNotice({ ...player, type: input.type, date: session.date, reason: reason.slice(0, 200) }),
    url: `/presensi/${session.id}`,
    dedupeKey: `izin:${perm.id}`,
  });
  revalidatePath(`/ortu/${input.token}`);
  return { ok: true };
}
