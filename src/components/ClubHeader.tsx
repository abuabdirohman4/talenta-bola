import { clubInitials } from "@/lib/format";

/** Kop klub untuk halaman publik (ortu & rapor): terasa milik SSB, tanpa "Powered by". */
export function ClubHeader({ name, logoUrl, subtitle }: { name: string; logoUrl: string | null; subtitle?: string }) {
  return (
    <header className="flex items-center gap-3">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="size-12 rounded-xl object-cover" />
      ) : (
        <span className="grid size-12 place-items-center rounded-xl bg-primary text-lg font-extrabold text-white">
          {clubInitials(name)}
        </span>
      )}
      <div>
        <p className="text-base leading-tight font-black tracking-tight">{name}</p>
        {subtitle && <p className="text-xs font-medium text-muted">{subtitle}</p>}
      </div>
    </header>
  );
}
