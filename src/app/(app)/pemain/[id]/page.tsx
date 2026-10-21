import { and, eq, isNull } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { db } from "@/db";
import { players } from "@/db/schema";
import { getAgeGroups, getBaseUrl, getSsb } from "@/lib/data";
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
      <h2 className="mb-4 text-2xl font-extrabold tracking-tight">{p.fullName}</h2>
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
