async page => {
  const origin = "http://127.0.0.1:3001";
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const sitemap = await (await page.request.get(`${origin}/sitemap.xml`)).text();
  const paths = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => new URL(match[1]).pathname).filter(path => path !== "/");
  paths.push("/pagina-inexistente-design-qa");
  const results = [];
  for (const width of [1366, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 844 });
    for (const path of paths) {
      const response = await page.goto(origin + path, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => document.fonts.ready);
      for (const img of await page.locator("main img").all()) {
        await img.scrollIntoViewIfNeeded();
        await img.evaluate(element => element.decode().catch(() => {}));
      }
      await page.evaluate(() => scrollTo(0, 0));
      const details = await page.evaluate(() => ({
        heading: document.querySelector("h1")?.textContent,
        h1Count: document.querySelectorAll("h1").length,
        language: document.documentElement.lang,
        canonical: document.querySelector('link[rel="canonical"]')?.href,
        overflow: document.documentElement.scrollWidth > innerWidth,
        images: [...document.querySelectorAll("main img")].map(img => ({ alt: img.alt, loaded: img.complete && img.naturalWidth > 0 })),
      }));
      await page.screenshot({ path: `.codex/audits/redesign/current/${width}-public${path.replaceAll("/", "-")}.png`, fullPage: true });
      results.push({ width, path, status: response?.status(), ...details });
    }
  }
  return { results, pageErrors: errors };
}
