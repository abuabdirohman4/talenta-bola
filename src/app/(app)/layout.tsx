import { requireCoachPage } from "@/lib/auth/require-user";
import { getSsb } from "@/lib/data";
import { initials } from "@/lib/format";
import { BottomNav, SideNav } from "./_components/Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireCoachPage();
  const ssb = await getSsb();

  return (
    <div className="brand min-h-dvh" style={{ "--color-primary": ssb.primaryColor } as React.CSSProperties}>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-card lg:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <Logo name={ssb.name} logoUrl={ssb.logoUrl} />
          <div className="min-w-0">
            <p className="truncate font-bold leading-tight">{ssb.name}</p>
            <p className="text-xs text-muted">TalentaBola</p>
          </div>
        </div>
        <SideNav />
      </aside>

      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-line bg-card/95 px-4 py-3 backdrop-blur lg:hidden">
        <Logo name={ssb.name} logoUrl={ssb.logoUrl} small />
        <p className="truncate font-bold">{ssb.name}</p>
      </header>

      <main className="px-4 pt-4 pb-28 lg:ml-60 lg:px-8 lg:pt-8 lg:pb-12">
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>

      <BottomNav />
    </div>
  );
}

function Logo({ name, logoUrl, small }: { name: string; logoUrl: string | null; small?: boolean }) {
  const size = small ? "size-9 text-sm" : "size-11";
  return logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt="" className={`${size} shrink-0 rounded-xl object-cover`} />
  ) : (
    <span className={`${size} grid shrink-0 place-items-center rounded-xl bg-primary font-extrabold text-white`}>
      {initials(name)}
    </span>
  );
}
