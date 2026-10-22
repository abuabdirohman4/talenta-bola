import { expect, test, type Page } from "@playwright/test";

const CODE = process.env.COACH_ACCESS_CODE!;

async function login(page: Page) {
  await page.goto("/masuk");
  await page.getByLabel("Kode akses").fill(CODE);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL("/");
}

function tomorrow() {
  const d = new Date(Date.now() + 7 * 3600_000 + 86_400_000); // WIB + 1 hari
  return d.toISOString().slice(0, 10);
}

test("kode akses salah ditolak, halaman pelatih tertutup", async ({ page }) => {
  await page.goto("/pemain");
  await expect(page).toHaveURL(/\/masuk$/);
  await page.getByLabel("Kode akses").fill("bukan-kodenya");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page.getByText("Kode akses salah")).toBeVisible();
});

test("presensi 1-tap tetap tersimpan walau sinyal putus", async ({ page, context }) => {
  await login(page);
  await page.goto("/presensi");
  await page
    .getByRole("link", { name: /Lanjutkan presensi/ })
    .or(page.getByRole("button", { name: "Mulai presensi hari ini" }))
    .click();
  await expect(page).toHaveURL(/\/presensi\/[0-9a-f-]{36}$/);

  await page.getByRole("button", { name: /^Hadir — / }).first().click();
  await expect(page.getByText("Tersimpan", { exact: true })).toBeVisible();

  // Mode pesawat: tap tetap tercatat di HP dan statusnya jujur.
  await context.setOffline(true);
  await page.getByRole("button", { name: /^Sakit — / }).nth(1).click();
  await expect(page.getByText(/di HP, menunggu sinyal/)).toBeVisible();

  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.getByText("Tersimpan", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: /^Hadir — /, pressed: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^Sakit — / }).nth(1)).toHaveAttribute("aria-pressed", "true");
});

test("rapor: nilai + catatan, terbit, lalu dibuka ortu tanpa login", async ({ page, browser }) => {
  await login(page);
  await page.goto("/rapor");
  await page.getByRole("link", { name: /Periode/ }).first().click();
  await page.getByRole("link", { name: /^\d+ .*(Belum dinilai|Draf|Terbit)/ }).first().click();
  await expect(page.getByText(/Anak 1 dari/)).toBeVisible();

  await page.getByRole("radio", { name: /5 bintang/ }).first().click();
  const sentence = "Semangat latihan tinggi dan selalu datang tepat waktu.";
  const chip = page.getByRole("button", { name: sentence });
  if (await chip.isEnabled()) await chip.click();
  await expect(page.getByText("Tersimpan otomatis")).toBeVisible();

  const publish = page.getByRole("button", { name: /Terbitkan rapor/ });
  if (await publish.isVisible()) await publish.click();
  const link = page.getByRole("link", { name: "Lihat rapor" });
  await expect(link).toBeVisible();
  const href = (await link.getAttribute("href"))!;

  const ortu = await (await browser.newContext()).newPage();
  await ortu.goto(href);
  await expect(ortu.getByText("Rapor perkembangan pemain")).toBeVisible();
  await expect(ortu.getByText(sentence)).toBeVisible();
});

test("ortu mengajukan izin lewat link, pelatih melihatnya di lembar presensi", async ({ page, browser }) => {
  await login(page);
  // Sesi besok supaya izin diterima (izin hanya untuk sesi yang belum lewat).
  const label = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", weekday: "long", day: "numeric", month: "short", year: "numeric" })
    .format(new Date(tomorrow() + "T00:00:00Z"));
  await page.goto("/jadwal");
  const row = page.getByRole("listitem").filter({ hasText: label });
  // Besok bisa sudah terisi dari jadwal rutin; kalau belum, tambah sesi manual.
  if (!(await row.count())) {
    await page.getByRole("button", { name: "Tambah sesi" }).click();
    await page.getByLabel("Tanggal").fill(tomorrow());
    await page.getByRole("button", { name: "Simpan sesi" }).click();
  }
  await row.getByRole("link", { name: /Atur sesi/ }).click();
  await expect(page).toHaveURL(/\/presensi\/[0-9a-f-]{36}$/);
  const sessionUrl = page.url();

  await page.goto("/pemain");
  await page.getByRole("link", { name: /Argya/ }).click();
  const wa = await page.getByRole("link", { name: /Kirim (ke WA ortu|lewat WA)/ }).getAttribute("href");
  const parentUrl = decodeURIComponent(wa!).match(/https?:\/\/\S+\/ortu\/[A-Za-z0-9_-]+/)![0];

  const ortu = await (await browser.newContext()).newPage();
  await ortu.goto(parentUrl);
  await ortu.getByRole("radio", { name: new RegExp(label) }).check();
  await ortu.getByRole("button", { name: "Sakit" }).click();
  await ortu.getByLabel("Alasan").fill("Demam sejak semalam");
  await ortu.getByRole("button", { name: /Kirim keterangan sakit/ }).click();
  await expect(ortu.getByText(/Izin terkirim/)).toBeVisible();

  await page.goto(sessionUrl);
  await expect(page.getByText("Alasan ortu: Demam sejak semalam")).toBeVisible();
});
