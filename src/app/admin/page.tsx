import { asc, isNull, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { ThemeToggle } from "@/components/ThemeToggle";
import { db } from "@/db";
import { ssbProfiles } from "@/db/schema";
import { requireAdminPage } from "@/lib/auth/require-user";
import { dateWib, formatDateId } from "@/lib/format";
import { AdminLogout, CreateSsbForm, SsbActions } from "./_components/AdminForms";

export const metadata: Metadata = { title: "Super-admin", robots: { index: false } };

export default async function AdminPage() {
  await requireAdminPage();
  // Hanya angka per klub — nama/data anak tidak pernah tampil di halaman pemilik produk.
  const clubs = await db
    .select({
      id: ssbProfiles.id,
      name: ssbProfiles.name,
      slug: ssbProfiles.slug,
      primaryColor: ssbProfiles.primaryColor,
      createdAt: ssbProfiles.createdAt,
      hasCode: sql<boolean>`${ssbProfiles.accessCodeHash} is not null`,
      groups: sql<number>`(select count(*)::int from age_groups g where g.ssb_id = ssb_profiles.id and g.deleted_at is null)`,
      players: sql<number>`(select count(*)::int from players p where p.ssb_id = ssb_profiles.id and p.is_active and p.deleted_at is null)`,
    })
    .from(ssbProfiles)
    .where(isNull(ssbProfiles.deletedAt))
    .orderBy(asc(ssbProfiles.createdAt));

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-10">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">TalentaBola · super-admin</p>
          <h1 className="text-2xl font-black tracking-tight">Klub terdaftar</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle className="size-9" />
          <AdminLogout />
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-line bg-card shadow-sm lg:col-span-2">
          <h2 className="border-b border-line px-5 py-3 text-xs font-extrabold tracking-wider uppercase">
            {clubs.length} SSB aktif
          </h2>
          {clubs.length ? (
            <ul className="divide-y divide-line">
              {clubs.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <span className="size-3 shrink-0 rounded-full" style={{ background: c.primaryColor }} aria-hidden />
                  <div className="min-w-48 flex-1">
                    <p className="truncate font-bold">{c.name}</p>
                    <p className="text-xs text-muted">
                      {c.slug} · dibuat {formatDateId(dateWib(c.createdAt), { weekday: false })}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-bold">
                      <span className="rounded-md border border-line bg-subtle px-2 py-0.5 text-muted">{c.groups} KU</span>
                      <span className="rounded-md border border-line bg-subtle px-2 py-0.5 text-muted">{c.players} pemain aktif</span>
                      {!c.hasCode && <span className="rounded-md bg-alpa/10 px-2 py-0.5 text-alpa">Belum ada kode akses</span>}
                    </p>
                  </div>
                  <SsbActions ssb={{ id: c.id, name: c.name }} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-sm text-muted">Belum ada SSB. Tambahkan klub pertama di samping.</p>
          )}
        </section>
        <CreateSsbForm />
      </div>
    </main>
  );
}
