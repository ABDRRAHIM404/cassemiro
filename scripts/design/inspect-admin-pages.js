async page => {
  const origin = new URL(page.url()).origin;
  await page.route("https://*.supabase.co/**", route => route.request().method() === "GET" ? route.continue() : route.fulfill({status:409, body:"Read-only design verification: mutations disabled"}));
  const baseline = origin.includes("vercel.app");
  const output = baseline ? "baseline" : "current";
  const routes = new Set(["/admin", "/admin/orcamentos", "/admin/projetos", "/admin/projetos/novo", "/admin/servicos", "/admin/depoimentos", "/admin/conteudo", "/admin/configuracoes", "/admin/redefinir-senha"]);
  for (const section of ["projetos", "servicos", "depoimentos", "orcamentos"]) {
    await page.goto(`${origin}/admin/${section}`, { waitUntil: "domcontentloaded" });
    for (const href of await page.locator("main a[href]").evaluateAll(links => links.map(link => link.getAttribute("href")))) {
      if (new RegExp(`^/admin/${section}/[0-9a-f-]{36}$`).test(href)) routes.add(href);
    }
  }
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const results = [];
  for (const width of baseline ? [1366,390] : [1366,390,320]) {
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 844 });
    for (const path of routes) {
      const response = await page.goto(origin + path, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => document.fonts.ready);
      for (const img of await page.locator("main img").all()) {
        await img.scrollIntoViewIfNeeded();
        await page.waitForFunction(element => element.complete && element.naturalWidth > 0, await img.elementHandle(), {timeout:15000}).catch(() => {});
        await img.evaluate(element => element.decode().catch(() => {}));
      }
      await page.evaluate(() => { document.activeElement?.blur?.(); scrollTo(0,0); });
      const report = await page.evaluate(() => ({
        heading: document.querySelector("h1")?.textContent,
        overflow: document.documentElement.scrollWidth > innerWidth,
        fields: [...document.querySelectorAll("main input, main textarea, main select")].map(field => field.name),
        failedImages: [...document.querySelectorAll("main img")].filter(img => !img.complete || !img.naturalWidth).map(img => img.alt),
      }));
      await page.screenshot({ path: `.codex/audits/redesign/${output}/${width}-protected${path.replaceAll("/", "-")}.png`, fullPage: true });
      results.push({ width, path, status: response?.status(), authenticatedPath: new URL(page.url()).pathname, ...report });
    }
  }
  const finalReport = { scope: "Authenticated read-only rendering; no form submitted", count: results.length,
    routes: [...routes], widths: baseline ? [1366,390] : [1366,390,320],
    issues: results.filter(item => item.overflow || item.failedImages.length || item.authenticatedPath !== item.path || item.status !== 200),
    fieldCounts: results.filter(item => item.width === 1366).map(({path,fields}) => ({path,count:fields.length})), pageErrors: errors };
  await page.evaluate(report => { window.__CASSEMIRO_ADMIN_QA__ = report; }, finalReport);
  return finalReport;
}
