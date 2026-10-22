import { and, count, eq, isNull } from "drizzle-orm";
import { Suspense } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { db } from "@/db";
import { players } from "@/db/schema";
import { requireCoachPage } from "@/lib/auth/require-user";
import { getAgeGroups, getSsb } from "@/lib/data";
import { clubInitials, initials } from "@/lib/format";
import { BottomNav, KuPanel, MobileKuLine, type NavGroup, SideNav, ThemeRow, TopBar } from "./_components/Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireCoachPage();
  const ssb = await getSsb();
  const [ageGroups, counts] = await Promise.all([
    getAgeGroups(ssb.id),
    db
      .select({ groupId: players.ageGroupId, n: count() })
      .from(players)
      .where(and(eq(players.ssbId, ssb.id), eq(players.isActive, true), isNull(players.deletedAt)))
      .groupBy(players.ageGroupId),
  ]);
  const groups: NavGroup[] = ageGroups.map((g) => ({
    id: g.id,
    name: g.name,
    code: g.code,
    birthYear: g.birthYear,
    players: counts.find((c) => c.groupId === g.id)?.n ?? 0,
  }));
  const totalPlayers = counts.reduce((s, c) => s + c.n, 0);

  return (
    <div className="brand min-h-dvh" style={{ "--color-primary": ssb.primaryColor } as React.CSSProperties}>
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-card shadow-sm md:flex lg:w-72">
        <div className="flex items-center gap-3 border-b border-line p-5">
          <Logo name={ssb.name} logoUrl={ssb.logoUrl} />
          <div className="min-w-0">
            <p className="text-sm font-extrabold tracking-tight">TalentaBola</p>
            <p className="truncate text-[11px] font-medium text-muted">{ssb.name}</p>
          </div>
        </div>
        <Suspense>
          <KuPanel groups={groups} />
        </Suspense>
        <SideNav playerCount={totalPlayers} />
        <div className="m-2 space-y-2 border-t border-line p-3">
          <ThemeRow />
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-linear-to-br from-primary to-primary-2 text-xs font-bold text-white shadow-sm">
              {initials(ssb.headCoachName ?? "Coach")}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-xs font-bold">{ssb.headCoachName ?? "Pelatih"}</p>
              <p className="truncate text-[10px] text-muted">Pelatih Kepala</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col md:ml-64 lg:ml-72">
        <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-card/95 px-4 py-3 shadow-sm backdrop-blur-md md:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            <Logo name={ssb.name} logoUrl={ssb.logoUrl} small />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-black tracking-tight">{ssb.name}</p>
              <Suspense>
                <MobileKuLine groups={groups} coach={ssb.headCoachName} />
              </Suspense>
            </div>
          </div>
          <ThemeToggle className="size-9" />
        </header>

        <Suspense>
          <TopBar ssbName={ssb.name} groups={groups} />
        </Suspense>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-28 md:px-8 md:pt-8 md:pb-12">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}

function Logo({ name, logoUrl, small }: { name: string; logoUrl: string | null; small?: boolean }) {
  const size = small ? "size-9 text-xs" : "size-10 text-sm";
  return logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt="" className={`${size} shrink-0 rounded-xl object-cover`} />
  ) : (
    <span
      className={`${size} grid shrink-0 place-items-center rounded-xl bg-linear-to-br from-primary to-primary-2 font-black tracking-wider text-white shadow-sm`}
    >
      {clubInitials(name)}
    </span>
  );
}
