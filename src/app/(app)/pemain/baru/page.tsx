import type { Metadata } from "next";
import { getActiveGroup } from "@/lib/data";
import { PlayerForm } from "../_components/PlayerForm";

export const metadata: Metadata = { title: "Tambah pemain" };

export default async function NewPlayerPage({ searchParams }: { searchParams: Promise<{ ku?: string }> }) {
  const { groups, group } = await getActiveGroup((await searchParams).ku);
  if (!group) return <p>Belum ada kelompok umur. Tambahkan di Pengaturan.</p>;

  return (
    <>
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
