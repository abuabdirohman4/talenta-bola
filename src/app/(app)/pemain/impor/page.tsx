import type { Metadata } from "next";
import { BackLink } from "@/components/BackLink";
import { getActiveGroup } from "@/lib/data";
import { ImportForm } from "./_components/ImportForm";

export const metadata: Metadata = { title: "Impor pemain" };

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ ku?: string }> }) {
  const { groups, group } = await getActiveGroup((await searchParams).ku);
  if (!group) return <p>Belum ada kelompok umur. Tambahkan di Pengaturan.</p>;

  return (
    <>
      <BackLink href={`/pemain?ku=${group.id}`}>Daftar pemain</BackLink>
      <h2 className="text-2xl font-extrabold tracking-tight">Impor dari daftar WA</h2>
      <p className="mt-1 mb-4 text-muted">
        Salin pesan daftar presensi dari grup WA (yang bernomor), tempel di bawah. Emoji, “ijin”, dan baris instruksi
        dibuang otomatis; nama yang sudah ada dilewati.
      </p>
      <ImportForm groups={groups.map((g) => ({ id: g.id, name: g.name }))} defaultGroupId={group.id} />
    </>
  );
}
