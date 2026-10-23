import { and, count, desc, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { db } from "@/db";
import { notifications, players } from "@/db/schema";
import { requireCoachPage } from "@/lib/auth/require-user";
import { getAgeGroups, getSsb } from "@/lib/data";
import { clubInitials } from "@/lib/format";
import { NotifBell } from "./_components/NotifBell";
import { BottomNav, CoachChip, KuPanel, MobileHeaderLead, MobileKuLine, type NavGroup, SideNav, SidebarToggle, ThemeRow, TopBar } from "./_components/Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireCoachPage();
  const ssb = await getSsb();
  const [ageGroups, counts, [{ unread }], recent] = await Promise.all([
    getAgeGroups(ssb.id),
    db
      .select({ groupId: players.ageGroupId, n: count() })
      .from(players)
      .where(and(eq(players.ssbId, ssb.id), eq(players.isActive, true), isNull(players.deletedAt)))
      .groupBy(players.ageGroupId),
    db
      .select({ unread: count() })
      .from(notifications)
      .where(and(eq(notifications.ssbId, ssb.id), isNull(notifications.readAt))),
    db.select().from(notifications).where(eq(notifications.ssbId, ssb.id)).orderBy(desc(notifications.createdAt)).limit(6),
  ]);
  const notifs = recent.map((n) => ({ id: n.id, title: n.title, body: n.body, url: n.url, createdAt: n.createdAt.toISOString(), read: !!n.readAt }));
  const groups: NavGroup[] = ageGroups.map((g) => ({
    id: g.id,
    name: g.name,
    code: g.code,
    birthYear: g.birthYear,
    players: counts.find((c) => c.groupId === g.id)?.n ?? 0,
    coach: g.coachName ?? ssb.headCoachName,
  }));
  const savedKu = (await cookies()).get("tb_ku")?.value;

  return (
    <div className="brand min-h-dvh" style={{ "--color-primary": ssb.primaryColor } as React.CSSProperties}>
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-(--sbw) flex-col overflow-hidden border-r border-line bg-card shadow-sm transition-[width] duration-200 motion-reduce:transition-none md:flex">
        <div className="sb-head sb-center relative flex items-center gap-3 border-b border-line p-4">
          <Logo name={ssb.name} logoUrl={ssb.logoUrl} />
          <div className="sb-hide min-w-0 flex-1">
            <p className="text-sm font-extrabold tracking-tight">TalentaBola</p>
            <p className="truncate text-[11px] font-medium text-muted">{ssb.name}</p>
          </div>
          <SidebarToggle />
        </div>
        <Suspense>
          <KuPanel groups={groups} savedKu={savedKu} />
        </Suspense>
        <Suspense>
          <SideNav groups={groups} savedKu={savedKu} />
        </Suspense>
        <div className="m-2 space-y-2 border-t border-line p-3">
          <ThemeRow />
          <Suspense>
            <CoachChip groups={groups} savedKu={savedKu} />
          </Suspense>
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col transition-[margin] duration-200 motion-reduce:transition-none md:ml-(--sbw)">
        <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-card/95 px-4 py-3 shadow-sm backdrop-blur-md md:hidden">
          <MobileHeaderLead>
              <div className="flex min-w-0 items-center gap-2.5">
                <Logo name={ssb.name} logoUrl={ssb.logoUrl} small />
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-black tracking-tight">{ssb.name}</p>
                  <Suspense>
                    <MobileKuLine groups={groups} savedKu={savedKu} />
                  </Suspense>
                </div>
              </div>
          </MobileHeaderLead>
          <div className="flex shrink-0 items-center gap-2">
            <NotifBell unread={unread} />
            <ThemeToggle className="size-9" />
          </div>
        </header>

        <TopBar ssbName={ssb.name} groups={groups} unread={unread} savedKu={savedKu} notifs={notifs} />

        <main className="w-full flex-1 px-4 pt-4 pb-28 md:px-8 md:pt-8 md:pb-12">{children}</main>
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
