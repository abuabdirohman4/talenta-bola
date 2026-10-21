import type { Metadata } from "next";
import { getAgeGroups, getSsb } from "@/lib/data";
import { AgeGroupForm, LogoutButton, SsbForm } from "./_components/SettingsForms";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function PengaturanPage() {
  const ssb = await getSsb();
  const groups = await getAgeGroups(ssb.id);

  return (
    <>
      <h2 className="mb-4 text-2xl font-extrabold tracking-tight">Pengaturan</h2>
      <SsbForm
        initial={{
          name: ssb.name,
          headCoachName: ssb.headCoachName ?? "",
          homeGround: ssb.homeGround ?? "",
          phoneWa: ssb.phoneWa ?? "",
          primaryColor: ssb.primaryColor,
          logoUrl: ssb.logoUrl ?? "",
        }}
      />

      <section className="mt-5 rounded-2xl border border-line bg-card p-4">
        <h3 className="font-bold">Kelompok umur</h3>
        <ul className="mt-2 divide-y divide-line">
          {groups.map((g) => (
            <li key={g.id} className="flex min-h-11 items-center justify-between py-2">
              <span className="font-semibold">{g.name}</span>
              <span className="text-sm text-muted">
                {g.code}
                {g.birthYear ? ` · lahir ${g.birthYear}` : ""}
              </span>
            </li>
          ))}
        </ul>
        <AgeGroupForm />
      </section>

      <LogoutButton />
    </>
  );
}
