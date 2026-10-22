import { and, eq, isNull } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { BackLink } from "@/components/BackLink";
import { db } from "@/db";
import { players } from "@/db/schema";
import { getAgeGroups, getBaseUrl, getSsb } from "@/lib/data";
import { positionLabel } from "@/lib/players";
import { ParentLinkCard } from "../_components/ParentLinkCard";
import { PlayerForm } from "../_components/PlayerForm";

export const metadata: Metadata = { title: "Data pemain" };

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const ssb = await getSsb();
  const [[p], groups] = await Promise.all([
    db
      .select()
      .from(players)
      .where(and(eq(players.id, id), eq(players.ssbId, ssb.id), isNull(players.deletedAt))),
    getAgeGroups(ssb.id),
  ]);
  if (!p) notFound();

  const s = (v: string | number | null) => (v == null ? "" : String(v));
  return (
    <>
      <BackLink href={`/pemain?ku=${p.ageGroupId}`}>Daftar pemain</BackLink>
      <div className="mb-5 flex max-w-3xl items-center gap-3">
        <Avatar name={p.fullName} photoUrl={p.photoUrl} className="size-14 text-lg" />
        <div className="min-w-0">
          <h2 className="truncate text-xl font-extrabold tracking-tight">{p.fullName}</h2>
          <p className="truncate text-xs font-medium text-muted">
            {[positionLabel(p.position), p.jerseyNumber != null && `#${p.jerseyNumber}`, !p.isActive && "Nonaktif"].filter(Boolean).join(" · ") ||
              "Posisi belum ditentukan"}
          </p>
        </div>
      </div>
      <ParentLinkCard
        playerId={p.id}
        playerName={p.nickname || p.fullName}
        ssbName={ssb.name}
        parentPhoneWa={p.parentPhoneWa}
        baseUrl={await getBaseUrl()}
        token={p.parentToken}
      />
      <PlayerForm
        groups={groups}
        initial={{
          id: p.id,
          ageGroupId: p.ageGroupId,
          fullName: p.fullName,
          nickname: s(p.nickname),
          birthDate: s(p.birthDate),
          jerseyNumber: s(p.jerseyNumber),
          position: s(p.position),
          preferredFoot: s(p.preferredFoot),
          heightCm: s(p.heightCm),
          weightKg: s(p.weightKg),
          parentName: s(p.parentName),
          parentPhoneWa: s(p.parentPhoneWa),
          photoUrl: s(p.photoUrl),
          isActive: p.isActive,
        }}
      />
    </>
  );
}
