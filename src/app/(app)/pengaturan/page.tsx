import type { Metadata } from "next";
import { getAgeGroups, getSsb } from "@/lib/data";
import { InstallCard } from "../_components/InstallCard";
import { AccessCodeForm, AgeGroupForm, LogoutButton, SsbForm } from "./_components/SettingsForms";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function PengaturanPage() {
  const ssb = await getSsb();
  const groups = await getAgeGroups(ssb.id);

  return (
    <div className="space-y-4">
      <div className="md:hidden">
        <p className="eyebrow">Klub</p>
        <h2 className="text-xl font-black tracking-tight">Pengaturan</h2>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
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
        </div>

        <div>
          <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
            <h3 className="text-xs font-extrabold tracking-wider uppercase">Kelompok umur</h3>
            <ul className="mt-2 divide-y divide-line">
              {groups.map((g) => (
                <li key={g.id} className="flex min-h-11 items-center justify-between gap-2 py-2">
                  <span className="text-sm font-bold">{g.name}</span>
                  <span className="rounded-md border border-line bg-subtle px-2 py-0.5 text-[11px] font-bold text-muted">
                    {g.code}
                    {g.birthYear ? ` · ${g.birthYear}` : ""}
                  </span>
                </li>
              ))}
            </ul>
            <AgeGroupForm />
          </section>
          <InstallCard variant="settings" />
          <AccessCodeForm />
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
