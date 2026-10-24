// Potret alur presensi untuk video tutorial (DB demo, nama fiktif). Simpan juga kotak tiap tombol yang ditap (px gambar) ke taps.json.
// Pakai: node video/shoot-presensi.cjs <base> <kode> <folder keluaran>
const { chromium } = require("@playwright/test");
const fs = require("node:fs");
const [B, CODE, OUT] = process.argv.slice(2);
const DSF = 3;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: DSF, isMobile: true, hasTouch: true,
    colorScheme: "light", locale: "id-ID", permissions: ["clipboard-read", "clipboard-write"],
    recordVideo: { dir: OUT + "/rec", size: { width: 390, height: 844 } },
  });
  await ctx.addInitScript(() => addEventListener("DOMContentLoaded", () => {
    const s = document.createElement("style");
    s.textContent = "nextjs-portal{display:none!important}";
    document.head.append(s);
  }));
  const page = await ctx.newPage();
  const taps = {};
  const shot = async (name) => {
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/${name}.jpg`, type: "jpeg", quality: 92 });
    console.log(name);
  };
  const box = async (name, loc) => {
    const r = await loc.boundingBox();
    taps[name] = { x: Math.round(r.x * DSF), y: Math.round(r.y * DSF), w: Math.round(r.width * DSF), h: Math.round(r.height * DSF) };
  };
  const top = () => page.evaluate(() => window.scrollTo(0, 0));

  await page.goto(B + "/masuk", { waitUntil: "networkidle" });
  await page.getByLabel("Kode akses").fill(CODE);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL(B + "/", { timeout: 60000 });

  await page.goto(B + "/presensi", { waitUntil: "networkidle" });
  await box("lanjutkan", page.getByRole("link", { name: /^Lanjutkan/ }));
  await shot("p01-presensi");
  await page.getByText(/^Sesi bulan ini/).scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 300));
  await shot("p02-riwayat-sebelum");
  await top();

  await page.getByRole("link", { name: /^Lanjutkan/ }).click();
  await page.waitForURL(/\/presensi\/[0-9a-f-]{36}$/, { timeout: 60000 });
  await page.waitForLoadState("networkidle");
  await top();
  await shot("p03-lembar");

  const seq = [["Hadir", "Athar"], ["Hadir", "Bima"], ["Izin", "Candra"], ["Sakit", "Daffa"], ["Hadir", "Elang"]];
  for (const [i, [st, nm]] of seq.entries()) {
    const btn = page.getByRole("button", { name: new RegExp(`^${st} — ${nm}`) });
    await top();
    await box(`tap${i + 1}`, btn);
    await btn.click();
    await top();
    await shot(`p${String(4 + i).padStart(2, "0")}-tap-${st.toLowerCase()}-${nm.toLowerCase()}`);
  }

  // Tanpa sinyal: tap tetap tercatat di HP, badge jujur.
  await ctx.setOffline(true);
  const fikri = page.getByRole("button", { name: /^Hadir — Fikri/ });
  await fikri.scrollIntoViewIfNeeded();
  await box("tapOffline", fikri);
  await fikri.click();
  await page.getByText(/belum terkirim/).waitFor({ timeout: 10000 });
  await shot("p09-offline");
  await ctx.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.getByText(/belum terkirim/).waitFor({ state: "hidden", timeout: 15000 });
  await shot("p10-online");

  await top();
  const semua = page.getByRole("button", { name: /Hadir semua/ });
  await box("hadirSemua", semua);
  await semua.click();
  await shot("p11-konfirmasi");
  await page.getByRole("button", { name: "Ya, tandai Hadir" }).click();
  await top();
  await shot("p12-hadir-semua");

  const rekap = page.getByRole("button", { name: /Salin rekap/ });
  await box("salinRekap", rekap);
  await rekap.click();
  await shot("p13-rekap-tersalin");
  fs.writeFileSync(`${OUT}/rekap.txt`, await page.evaluate(() => navigator.clipboard.readText()));

  await page.goto(B + "/presensi", { waitUntil: "networkidle" });
  await shot("p14-presensi-sesudah");
  await page.getByText(/^Sesi bulan ini/).scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 300));
  await shot("p15-riwayat");

  fs.writeFileSync(`${OUT}/taps.json`, JSON.stringify(taps, null, 1));
  await ctx.close();
  await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
