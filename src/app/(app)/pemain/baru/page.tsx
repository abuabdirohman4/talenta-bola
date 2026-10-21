import type { Metadata } from "next";
import { BackLink } from "@/components/BackLink";
import { getActiveGroup } from "@/lib/data";
import { PlayerForm } from "../_components/PlayerForm";

export const metadata: Metadata = { title: "Tambah pemain" };

export default async function NewPlayerPage({ searchParams }: { searchParams: Promise<{ ku?: string }> }) {
  const { groups, group } = await getActiveGroup((await searchParams).ku);
  if (!group) return <p>Belum ada kelompok umur. Tambahkan di Pengaturan.</p>;

  return (
    <>
      <BackLink href={`/pemain?ku=${group.id}`}>Daftar pemain</BackLink>
      <h2 className="mb-4 text-2xl font-extrabold tracking-tight">Tambah pemain</h2>
      <PlayerForm
        groups={groups}
        initial={{
          ageGroupId: group.id,
          fullName: "",
          nickname: "",
          birthDate: "",
          jerseyNumber: "",
          position: "",
          preferredFoot: "",
          heightCm: "",
          weightKg: "",
          parentName: "",
          parentPhoneWa: "",
          photoUrl: "",
          isActive: true,
        }}
      />
    </>
  );
}
