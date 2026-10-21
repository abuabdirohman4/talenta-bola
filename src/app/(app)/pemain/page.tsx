import { and, asc, eq, isNull } from "drizzle-orm";
import { FileInput, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { KuSwitcher } from "@/components/KuSwitcher";
import { buttonClass } from "@/components/ui/Button";
import { db } from "@/db";
import { players } from "@/db/schema";
import { getActiveGroup } from "@/lib/data";
import { PlayerList } from "./_components/PlayerList";

export const metadata: Metadata = { title: "Pemain" };

export default async function PemainPage({ searchParams }: { searchParams: Promise<{ ku?: string }> }) {
  const { groups, group } = await getActiveGroup((await searchParams).ku);
  if (!group) return <p>Belum ada kelompok umur. Tambahkan di Pengaturan.</p>;

  const rows = await db
    .select({
      id: players.id,
      fullName: players.fullName,
      nickname: players.nickname,
      jerseyNumber: players.jerseyNumber,
      position: players.position,
      birthDate: players.birthDate,
      parentPhoneWa: players.parentPhoneWa,
      photoUrl: players.photoUrl,
      isActive: players.isActive,
    })
    .from(players)
    .where(and(eq(players.ageGroupId, group.id), isNull(players.deletedAt)))
    .orderBy(asc(players.sortOrder), asc(players.fullName));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-extrabold tracking-tight">
          Pemain {group.name} <span className="text-muted">· {rows.filter((r) => r.isActive).length}</span>
        </h2>
        <div className="flex gap-2">
          <Link href={`/pemain/impor?ku=${group.id}`} className={buttonClass("outline")}>
            <FileInput size={18} aria-hidden /> Impor dari WA
          </Link>
          <Link href={`/pemain/baru?ku=${group.id}`} className={buttonClass("primary")}>
            <UserPlus size={18} aria-hidden /> Tambah
          </Link>
        </div>
      </div>
      <KuSwitcher groups={groups} activeId={group.id} basePath="/pemain" />
      <PlayerList players={rows} importHref={`/pemain/impor?ku=${group.id}`} />
    </>
  );
}
