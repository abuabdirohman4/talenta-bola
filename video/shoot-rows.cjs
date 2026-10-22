// Potret daftar anak di lembar presensi yang sudah ditap (lanjutan shoot.cjs).
const { chromium } = require("@playwright/test");
const [B, CODE, SID] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: "light", locale: "id-ID" });
  const page = await ctx.newPage();
  await page.goto(B + "/masuk");
  await page.fill("input[name=code]", CODE);
  await page.click("button[type=submit]");
  await page.waitForURL(B + "/", { timeout: 60000 });
  await page.goto(`${B}/presensi/${SID}`);
  await page.waitForSelector('button[aria-label^="Hadir —"]');
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  const first = (await page.$$('button[aria-label^="Hadir —"]'))[0];
  await first.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 140));
  await page.waitForTimeout(900);
  await page.screenshot({ path: __dirname + "/assets/sheet-rows.jpg", type: "jpeg", quality: 90 });
  await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
