async page => {
  const origin = page.url().startsWith("https://cassemiro-one.vercel.app/")
    ? "https://cassemiro-one.vercel.app" : "http://127.0.0.1:3001";
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const sitemap = await (await page.request.get(`${origin}/sitemap.xml`)).text();
  const paths = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => new URL(match[1]).pathname);
  paths.push("/pagina-inexistente-design-qa", "/admin/login", "/admin/esqueci-senha");
  const results = [];
  for (const width of [1366, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 844 });
    for (const path of paths) {
      const response = await page.goto(origin + path, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => document.fonts.ready);
      for (const img of await page.locator("main img").all()) {
        await img.scrollIntoViewIfNeeded();
        await page.waitForFunction(img => img.complete && img.naturalWidth > 0, await img.elementHandle());
        await img.evaluate(img => img.decode());
      }
      await page.evaluate(() => scrollTo(0, 0));
      const details = await page.evaluate(() => ({
        h1: document.querySelector("h1")?.textContent,
        overflow: document.documentElement.scrollWidth > innerWidth,
        canonical: document.querySelector('link[rel="canonical"]')?.href ?? null,
        imageCount: document.querySelectorAll("main img").length,
        imageFailures: [...document.querySelectorAll("main img")].filter(img => !img.complete || !img.naturalWidth).length,
      }));
      const expectedStatus = path.includes("pagina-inexistente") ? 404 : 200;
      if (response?.status() !== expectedStatus || details.overflow || details.imageFailures) throw Error(JSON.stringify({ width, path, status: response?.status(), ...details }));
      if (origin.startsWith("https:") && !path.startsWith("/admin") && expectedStatus === 200 && details.canonical !== origin + (path === "/" ? "/" : path)) throw Error(`Unexpected canonical: ${details.canonical}`);
      results.push({ width, path, status: response.status(), ...details });
    }
  }
  if (errors.length) throw Error(JSON.stringify(errors));
  await page.evaluate(report => { window.__CASSEMIRO_FINAL_PUBLIC_QA__ = report; }, { origin, results, pageErrors: errors });
  return { origin, states: results.length, imageFailures: 0, overflow: false, pageErrors: errors, results };
}
