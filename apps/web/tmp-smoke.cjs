const { chromium } = require("playwright");
const BASE = "http://localhost:3000";
(async () => {
  const nav = await chromium.launch();
  const page = await (await nav.newContext()).newPage();
  const err = [];
  page.on("response", (r) => { if (r.status() >= 400 && r.url().includes("/api/")) err.push(`${r.status()} ${r.url().replace(BASE, "")}`); });
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', process.argv[2]);
  await page.fill('input[name="password"]', process.argv[3]);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(9000);
  console.log("  connexion ->", new URL(page.url()).pathname);
  for (const e of ["/dashboard", "/scanner", "/documents", "/users"]) {
    err.length = 0;
    await page.goto(BASE + e, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(7000);
    const t = await page.locator("body").innerText();
    console.log(`  ${e} : ${t.length > 150 ? "rendu" : "VIDE"} / erreurs ${err.length ? err.join(",") : "aucune"}`);
  }
  await nav.close();
})().catch((e) => { console.error("  ECHEC", e.message); process.exit(1); });
